"""
Email service using Resend for sending grant notifications.
"""
import os
from typing import List, Dict, Any
from datetime import datetime


def get_resend_client():
    """Get configured Resend client"""
    try:
        import resend
        resend.api_key = os.environ.get("RESEND_API_KEY")
        return resend
    except ImportError:
        print("[Email] Resend package not installed")
        return None


def render_grant_email(org_name: str, grants: List[Dict[str, Any]]) -> str:
    """
    Render HTML email template for grant notifications.
    """
    grants_html = ""
    for grant in grants:
        grants_html += f"""
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 16px; border-left: 4px solid #6366f1;">
            <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 18px;">{grant.get('name', 'Unnamed Grant')}</h3>
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">
                <strong>Agency:</strong> {grant.get('agency_name', 'N/A')}
            </p>
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">
                <strong>Max Funding:</strong> ${grant.get('max_funding', 'N/A'):,}
            </p>
            <p style="margin: 0 0 12px 0; color: #475569; font-size: 14px;">
                {grant.get('strategic_intent', '')[:200]}...
            </p>
            <a href="{grant.get('original_url', '#')}" 
               style="display: inline-block; background: #6366f1; color: white; padding: 8px 16px; 
                      border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
                View Grant →
            </a>
        </div>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                 background: #f1f5f9; margin: 0; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; 
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); 
                        padding: 32px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                    🎯 GrantRadarSG
                </h1>
                <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                    New grants matching your criteria
                </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px;">
                <p style="color: #334155; font-size: 16px; margin: 0 0 24px 0;">
                    Hi <strong>{org_name}</strong>,
                </p>
                <p style="color: #475569; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">
                    Great news! We found <strong>{len(grants)} new grant(s)</strong> that match 
                    your organization's criteria. Check them out below:
                </p>
                
                <!-- Grants List -->
                {grants_html}
                
                <p style="color: #64748b; font-size: 14px; margin: 24px 0 0 0; line-height: 1.6;">
                    Don't miss out on these opportunities! Apply before the deadlines.
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px;">
                    You're receiving this because you subscribed to grant notifications.
                </p>
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                    © {datetime.now().year} GrantRadarSG. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    return html


def send_grant_notification(
    email: str, 
    org_name: str, 
    grants: List[Dict[str, Any]],
    from_email: str = "GrantRadarSG <onboarding@resend.dev>"
) -> bool:
    """
    Send email notification about new matching grants.
    
    Args:
        email: Recipient email address
        org_name: Organization name for personalization
        grants: List of matching grant dictionaries
        from_email: Sender email address
        
    Returns:
        True if email sent successfully, False otherwise
    """
    resend = get_resend_client()
    if not resend:
        print(f"[Email] Cannot send - Resend not configured")
        return False
    
    if not grants:
        print(f"[Email] No grants to notify about for {email}")
        return False
    
    try:
        html_content = render_grant_email(org_name, grants)
        
        result = resend.Emails.send({
            "from": from_email,
            "to": email,
            "subject": f"🎯 {len(grants)} New Grant(s) Match Your Criteria!",
            "html": html_content
        })
        
        print(f"[Email] Sent notification to {email} - ID: {result.get('id', 'unknown')}")
        return True
        
    except Exception as e:
        print(f"[Email] Failed to send to {email}: {e}")
        return False


def send_test_email(email: str) -> bool:
    """Send a test email to verify configuration"""
    resend = get_resend_client()
    if not resend:
        return False
    
    try:
        result = resend.Emails.send({
            "from": "GrantRadarSG <onboarding@resend.dev>",
            "to": email,
            "subject": "✅ GrantRadarSG - Email Notifications Activated!",
            "html": """
            <div style="font-family: sans-serif; padding: 20px;">
                <h1>🎉 You're all set!</h1>
                <p>Your email subscription to GrantRadarSG is now active.</p>
                <p>You'll receive notifications when new grants match your criteria.</p>
            </div>
            """
        })
        print(f"[Email] Test email sent - ID: {result.get('id', 'unknown')}")
        return True
    except Exception as e:
        print(f"[Email] Test email failed: {e}")
        return False
