// Legacy SQLite cleanup must never run against the managed database implicitly.
throw new Error("SQLite cleanup is retired. Run journey tests on a dedicated Supabase test project, then remove those test users through Supabase Auth.");
