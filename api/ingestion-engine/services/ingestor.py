import os
import json
import asyncio
import base64
import httpx
from bs4 import BeautifulSoup, Comment
from google import genai
from google.genai.types import GenerateContentConfig, Part
from sqlmodel import Session
from database import get_session
from models import Grant


MODEL_ID = "gemini-3-flash-preview"
EMBEDDING_MODEL_ID = "text-embedding-004"

# Lazy-initialized client to avoid failures during deployment analysis
_client = None

def get_genai_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))
    return _client

async def fetch_grant_details(slug: str):
    """
    Fetches the detailed JSON from https://oursggrants.gov.sg/api/v1/grant_instruction/{slug}/...
    """
    api_url = f"https://oursggrants.gov.sg/api/v1/grant_instruction/{slug}/?page_type=instruction&user_type="
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(api_url)
            if resp.status_code == 200:
                print(f"[Ingest] Fetched details for {slug}")
                return resp.json()
            else:
                print(f"[Ingest] Details API failed: {resp.status_code}")
                return None
    except Exception as e:
        print(f"[Ingest] Details API Error: {e}")
        return None

def extract_relevant_images(soup, base_url, limit=3):
    """
    Finds relevant images (posters, criteria) and returns top N unique URLs.
    """
    candidates = []
    seen_urls = set()
    
    for img in soup.find_all("img"):
        src = img.get("src")
        if not src:
            continue
            
        # Resolve URL first to handle duplicates correctly
        if not src.startswith("http"):
             from urllib.parse import urljoin
             src = urljoin(base_url, src)
             
        if src in seen_urls:
            continue
        seen_urls.add(src)

        # 1. Negative Filter (Logos, Icons)
        alt = (img.get("alt") or "").lower()
        class_str = " ".join(img.get("class") or []).lower()
        src_lower = src.lower()
        
        exclusions = ["logo", "icon", "button", "social", "footer", "header"]
        if any(x in alt for x in exclusions) or \
           any(x in class_str for x in exclusions) or \
           any(x in src_lower for x in exclusions):
            continue

        # 2. Size Heuristic
        width = 0
        height = 0
        try:
            w_str = img.get("width", "").replace("px", "")
            h_str = img.get("height", "").replace("px", "")
            if w_str and w_str.isdigit(): width = int(w_str)
            if h_str and h_str.isdigit(): height = int(h_str)
        except:
            pass
            
        score = width * height
        
        # Boost keywords
        priority_keywords = ["eligibility", "criteria", "grant", "poster", "flyer", "flowchart", "process"]
        if any(k in alt for k in priority_keywords):
            score += 500000 

        # Min threshold (approx 150x150)
        if score > 20000: 
            candidates.append((score, src))

    # Sort by score descending
    candidates.sort(key=lambda x: x[0], reverse=True)
    
    # Return top N URLs
    return [x[1] for x in candidates[:limit]]

async def fetch_page_content(url: str):
    """
    Manually scrapes page text and MULTIPLE relevant images.
    Returns (cleaned_text, List[image_bytes], List[mime_type]).
    """
    if not url or not url.startswith("http"):
        return None, [], []

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0, headers=headers) as http_client:
            resp = await http_client.get(url)
            if resp.status_code >= 400:
                print(f"[Ingest] Scrape HTTP {resp.status_code} for {url}")
                if not resp.content:
                    return None, [], []
            
            soup = BeautifulSoup(resp.content, "html.parser")
            
            # --- Text Extraction ---
            for element in soup(["script", "style", "nav", "footer", "header", "noscript"]):
                element.decompose()
            comments = soup.find_all(string=lambda text: isinstance(text, Comment))
            for c in comments: c.extract()
            text_content = soup.get_text(separator="\n")
            clean_text = "\n".join([line.strip() for line in text_content.splitlines() if line.strip()])
            
            # --- Image Extraction ---
            image_data_list = []
            mime_type_list = []
            
            # 1. Get Top 10 Body Images
            target_urls = extract_relevant_images(soup, url, limit=10)
            
            # 2. Add OG Image if not present and we have space
            if len(target_urls) < 10:
                og_image = soup.find("meta", property="og:image")
                og_url = og_image.get("content") if og_image else None
                if og_url:
                    if not og_url.startswith("http"):
                        from urllib.parse import urljoin
                        og_url = urljoin(url, og_url)
                    if og_url not in target_urls:
                        target_urls.append(og_url)

            # 3. Fetch Images
            for img_url in target_urls:
                try:
                    # Filter out tiny SVGs or tracking pixels by extension if possible, but mime check is better
                    print(f"[Ingest] Fetching Image: {img_url}")
                    img_resp = await http_client.get(img_url, timeout=5.0)
                    
                    if img_resp.status_code == 200:
                        content_type = img_resp.headers.get("Content-Type", "").lower()
                        # Gemini supported MIME types for vision
                        supported_mimes = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"]
                        
                        # Check strict mime type matching or at least containment
                        if any(m in content_type for m in supported_mimes):
                            image_data_list.append(img_resp.content)
                            mime_type_list.append(content_type)
                        else:
                            print(f"[Ingest] Skipped unsupported image type: {content_type} for {img_url}")
                except Exception as e:
                    print(f"[Ingest] Failed img {img_url}: {e}")

            return clean_text, image_data_list, mime_type_list

    except Exception as e:
        print(f"[Ingest] Scrape Error for {url}: {e}")
        return None, [], []



def extract_smart_link(details_json):
    """
    Parses 'guideline_html' to find the best external link (e.g. 'more details', 'guidelines').
    Ignores internal links or documents (.xlsx).
    """
    html_content = details_json.get("guideline_html", "")
    if not html_content:
        return None
        
    soup = BeautifulSoup(html_content, "html.parser")
    for a in soup.find_all("a", href=True):
        href = a["href"]
        # Filter for logic
        if href.startswith("http") and "oursggrants.gov.sg" not in href:
             # This is likely an external agency site (e.g. sportsingapore.gov.sg)
             return href
    return None

def determine_is_open(details):
    """
    Parses 'closing_dates' to determine if the grant is open.
    Logic: If ANY category is 'Open', returns True.
    """
    closing_dates = details.get("closing_dates")
    if not closing_dates:
        return True # Default to Open if unknown
        
    # Check if any value string contains "Open" (case insensitive)
    # e.g. "individual": "Open for Applications" -> True
    # e.g. "organisation": "Applications closed" -> False
    for key, status_text in closing_dates.items():
        if status_text and "open" in str(status_text).lower():
            return True
            
    # If we have keys but none say open, assume closed
    return False

async def ingest_grant(grant_id: str, slug: str, external_url: str = None):
    print(f"[Ingest] Starting {grant_id} ({slug}) - via Details API + Smart Scraping")

    try:
        # 1. Fetch Details API
        details = await fetch_grant_details(slug) or {}
        
        # 2. Smart Link Extraction
        # Priority: 
        #   1. Link found in 'guideline_html' (The real source of truth)
        #   2. Provided external_url (likely deactivation_url, often 404)
        #   3. 'deactivation_url' from details
        
        smart_link = extract_smart_link(details)
        target_url = smart_link or external_url or details.get("deactivation_url")
        
        # Determine Status
        is_open_status = determine_is_open(details)
        
        scraped_text = ""
        image_bytes = None
        image_mime = None
        
        if target_url:
            print(f"[Ingest] Scraping Target: {target_url}")
            scraped_text, images_data, images_mimes = await fetch_page_content(target_url)

        # 3. Construct Context
        # Construct the "Application URL" as requested
        app_url = f"https://oursggrants.gov.sg/grants/{slug}/instruction"
        
        # Combine JSON details + Scraped Text
        combined_context = f"""
        --- DETAILS API JSON ---
        {json.dumps(details, indent=2)}
        --- END DETAILS API ---
        
        --- EXTERNAL WEBSITE CONTENT ({target_url}) ---
        {scraped_text[:20000] if scraped_text else "No external content scraped (or 404)."}
        --- END EXTERNAL CONTENT ---
        """

        # 4. Construct Prompt
        parts = []
        
        PROMPT_TEXT = f"""
        You are an expert Government Grant Analyst. 
        
        **TASK:**
        Analyze the provided GRANT DATA (API JSON + External Website).
        Extract structured data according to the JSON schema provided below.
        
        **INPUT DATA NOTES:**
        - I may have attached {len(images_data)} images extracted from the website. 
        - These could be posters, eligibility flowcharts, or infographics. Use them to extract details like criteria or funding amounts.
        - usage 'grant_amount' from API JSON as a hint for 'max_funding'.
        
        **CRITICAL INSTRUCTIONS:**
        1. **Strategic Intent:** Infer the "why" from the description and guidelines.
        2. **KPIs:** Look for outcomes/deliverables in the text.
        3. **Full Text Context:** Convert the significant content (Guidelines + Scraped Text) into clean **Markdown**.
        4. **Application URL**: Default to '{app_url}' unless you find a specific login link.
        5. **Images:** If I attached images, incorporate their text content into your analysis.
        
        **JSON SCHEMA:**
        {{
            "name": "{details.get('name', 'Official Name')}",
            "agency_name": "{details.get('agency_name', 'Agency Name')}",
            "original_url": "{target_url or app_url}",
            "application_url": "{app_url}",
            "applicant_types": ["List", "of", "eligible", "types", "e.g. NPO", "SME", "Individual"],
            "sectors": ["List", "of", "sectors", "e.g. Sports", "Arts", "Tech"],
            "max_funding": 100000 (integer number or null),
            "funding_percentage": 0.8 (float 0.0-1.0 or null),
            "strategic_intent": "Deep analysis of the hidden policy goal",
            "eligibility_summary": ["List", "of", "criteria"],
            "kpis": ["List", "of", "KPIs"],
            "full_text_context": "The comprehensive markdown transcription.",
            "image_urls": ["List", "of", "image", "urls", "found", "in", "text"]
        }}
        """
        
        parts.append(Part(text=PROMPT_TEXT))
        parts.append(Part(text=combined_context))

        # Attach ALL images
        if images_data:
            for i, img_bytes in enumerate(images_data):
                try:
                    mime = images_mimes[i]
                    parts.append(Part(inline_data={"mime_type": mime, "data": base64.b64encode(img_bytes).decode("utf-8")}))
                except Exception as e:
                    print(f"[Ingest] Could not attach image {i}: {e}")

        # Retry Loop for 429 Rate Limits
        for attempt in range(3):
            try:
                # 5. Call Gemini
                response = await get_genai_client().aio.models.generate_content(
                    model=MODEL_ID,
                    contents=parts,
                    config=GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                break # Success
            except Exception as e:
                if "429" in str(e) or "Resource" in str(e):
                    wait_time = (2 ** attempt) * 2 # 2s, 4s
                    print(f"[Ingest] Rate Limit (429) for {slug}. Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                    if attempt == 2: raise e # Fail after 3 tries
                else:
                    raise e # Other errors fail immediately

        if not response.candidates or not response.candidates[0].content.parts:
            print(f"[Ingest] No content returned from Gemini for {slug}")
            return False

        json_text = response.candidates[0].content.parts[0].text
        data = json.loads(json_text)
        
        if isinstance(data, list):
            data = data[0] if data else {}
        
        # 6. Generate Embedding
        text_to_embed = data.get("full_text_context", "")
        if not text_to_embed: 
            text_to_embed = f"{data.get('name')} {data.get('strategic_intent')}"
            
        embed_resp = await get_genai_client().aio.models.embed_content(
            model=EMBEDDING_MODEL_ID,
            contents=text_to_embed,
        )
        embedding_vector = embed_resp.embeddings[0].values
        
        # 7. Save to DB
        grant = Grant(
            id=grant_id,
            name=data.get("name", details.get("name", "Unknown Grant")),
            agency_name=data.get("agency_name", details.get("agency_name", "Unknown Agency")),
            # Append slug to URL to prevent Unique Constraint violations if multiple grants share one page
            original_url=f"{data.get('original_url') or target_url or app_url}#{slug}",
            application_url=data.get("application_url"),
            
            applicant_types=data.get("applicant_types", []),
            sectors=data.get("sectors", []),
            max_funding=data.get("max_funding"),
            funding_percentage=data.get("funding_percentage"),
            
            strategic_intent=data.get("strategic_intent"),
            eligibility_summary=data.get("eligibility_summary", []),
            kpis=data.get("kpis", []),
            
            full_text_context=text_to_embed,
            image_urls=data.get("image_urls", []),
            
            is_open=is_open_status,
            
            embedding=embedding_vector
        )
        
        with get_session() as session:
            session.merge(grant)
            session.commit()
            print(f"[Ingest] Saved {grant.name}")
            
        return True

    except Exception as e:
        print(f"[Error] Ingestion failed for {slug}: {e}")
        import traceback
        traceback.print_exc()
        return False
