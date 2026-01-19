import os
import resend

def send_welcome_email(email: str, org_name: str) -> bool:
    """
    Send a welcome email to confirm subscription.
    """
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        print("[Email] RESEND_API_KEY not set")
        return False
        
    resend.api_key = api_key
    
    try:
        print(f"[Email] Sending welcome email to {email}")
        result = resend.Emails.send({
            "from": "GrantRadarSG <hello@grantradarsg2026.site>",
            "to": email,
            "subject": "✅ GrantRadarSG - Alerts Activated!",
            "html": f"""
            <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #4F46E5;">Grant Radar Activated 🎯</h1>
                <p>Hi <strong>{org_name}</strong>,</p>
                <p>You have successfully subscribed to GrantRadarSG alerts.</p>
                <p>Our AI agents are now scanning for grants that match your profile. You will receive an email as soon as we find a match!</p>
                <br>
                <p style="color: #666; font-size: 12px;">GrantRadarSG Beta</p>
            </div>
            """
        })
        print(f"[Email] Success! ID: {result.get('id', 'unknown')}")
        return True
    except Exception as e:
        print(f"[Email] Failed to send: {e}")
        return False
