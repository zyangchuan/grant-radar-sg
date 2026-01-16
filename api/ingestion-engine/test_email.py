#!/usr/bin/env python3
"""
Test script for email automation feature.
Run from: api/ingestion-engine/
Usage: python test_email.py your-email@example.com
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv("../grant-query/.env")  # Also try grant-query .env

# Check for API key
api_key = os.environ.get("RESEND_API_KEY")
if not api_key:
    print("❌ RESEND_API_KEY not found in environment!")
    print("   Make sure your .env file has: RESEND_API_KEY=re_xxx...")
    sys.exit(1)

print(f"✅ RESEND_API_KEY found: {api_key[:10]}...")

# Import email service
from email_service import send_test_email, send_grant_notification

def test_basic_email(email: str):
    """Test sending a simple confirmation email"""
    print(f"\n📧 Testing basic email to: {email}")
    result = send_test_email(email)
    if result:
        print("✅ Basic email sent successfully!")
    else:
        print("❌ Basic email failed to send")
    return result

def test_grant_notification(email: str):
    """Test sending a grant notification email"""
    print(f"\n📧 Testing grant notification to: {email}")
    
    # Mock grant data
    mock_grant = {
        "name": "Test Grant - Environmental Sustainability",
        "agency_name": "Test Agency Singapore",
        "max_funding": 50000,
        "strategic_intent": "This is a test grant to verify email notifications are working correctly. It supports environmental sustainability initiatives.",
        "original_url": "https://example.com/grant"
    }
    
    result = send_grant_notification(email, "Test Organization", [mock_grant])
    if result:
        print("✅ Grant notification email sent successfully!")
    else:
        print("❌ Grant notification email failed to send")
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_email.py your-email@example.com")
        print("\nNote: With Resend free tier, you can only send to your own email")
        sys.exit(1)
    
    email = sys.argv[1]
    
    print("=" * 50)
    print("🧪 Email Automation Test Suite")
    print("=" * 50)
    
    # Run tests
    test1 = test_basic_email(email)
    test2 = test_grant_notification(email)
    
    print("\n" + "=" * 50)
    print("📊 Results:")
    print(f"   Basic Email: {'✅ PASS' if test1 else '❌ FAIL'}")
    print(f"   Grant Notification: {'✅ PASS' if test2 else '❌ FAIL'}")
    print("=" * 50)
    
    if test1 and test2:
        print("\n🎉 All tests passed! Check your inbox.")
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")
