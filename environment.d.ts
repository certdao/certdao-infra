declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DISCOURSE_API_KEY: string;
      DISCOURSE_URL: string;
      DISCOURSE_API_USERNAME: string;
      NODE_ENV: "development" | "production";
      LOG_LEVEL?: string;
      ORIGIN?: string;
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
// export {};
