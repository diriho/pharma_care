## api data fetch handler debugging
- Changed the authentication initialization and pharmacy loading to be more clearly separated. 
- The initial session lookup still happens on mount, but the auth state listener no longer performs await operations directly inside the callback.
- pharmacy loading is scheduled asynchronously, which avoids potential interactions between Supabase’s auth event system and your API calls. 
- add console log for debugggin purpose and see where the application is getting stuck during session retrieval, pharmacy loading, or API authentication.