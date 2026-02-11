import os
print("🚀 HELLO FROM NEXUS-PRIME!")
print(f"Current Directory: {os.getcwd()}")
print("Listing files...")
print(os.listdir())

try:
    import duckduckgo_search
    print("✅ DuckDuckGo Installed Successfully.")
except ImportError:
    print("❌ DuckDuckGo NOT Installed.")
