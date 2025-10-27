export declare const config: {
    port: string | number;
    nodeEnv: string;
    openai: {
        apiKey: string;
        model: string;
    };
    jwtSecret: string;
    apiRateLimit: number;
    corsOrigin: string[];
    logLevel: string;
    database: {
        url: string;
    };
    supabase: {
        url: string;
        anonKey: string;
    };
    ocr: {
        apiKey: string;
    };
};
export declare const validateConfig: () => void;
//# sourceMappingURL=env.d.ts.map