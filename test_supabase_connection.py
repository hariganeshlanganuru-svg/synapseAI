"""
SynapseAI - Supabase Connection Test Script
This script verifies that your Supabase connection is working correctly.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def test_supabase_connection():
    """Test the Supabase connection and display status"""
    
    print("🔄 Testing Supabase Connection...\n")
    
    # Get credentials from .env
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ ERROR: Missing SUPABASE_URL or SUPABASE_KEY in .env file")
        return False
    
    print(f"📍 Supabase URL: {supabase_url}")
    print(f"🔑 API Key: {supabase_key[:20]}...{supabase_key[-10:]}\n")
    
    try:
        # Create Supabase client
        supabase: Client = create_client(supabase_url, supabase_key)
        print("✅ Supabase client created successfully!")
        
        # Test connection by fetching profiles table
        response = supabase.table('profiles').select("*").limit(1).execute()
        print(f"✅ Connection test passed!")
        print(f"📊 Response status: Success")
        
        # Check if profiles table exists
        if hasattr(response, 'data'):
            print(f"✅ 'profiles' table accessible")
            print(f"📝 Sample data count: {len(response.data)}")
        
        # Test documents table
        docs_response = supabase.table('documents').select("*").limit(1).execute()
        if hasattr(docs_response, 'data'):
            print(f"✅ 'documents' table accessible")
            print(f"📄 Documents count: {len(docs_response.data)}")
        
        print("\n🎉 All tests passed! Supabase is connected and ready.")
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        print("\n💡 Troubleshooting tips:")
        print("   1. Verify your SUPABASE_URL and SUPABASE_KEY in .env")
        print("   2. Check if your Supabase project is active")
        print("   3. Ensure network connectivity")
        print("   4. Run 'supabase db push' to apply migrations")
        return False

if __name__ == "__main__":
    test_supabase_connection()
