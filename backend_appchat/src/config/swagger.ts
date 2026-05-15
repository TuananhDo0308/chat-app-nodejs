import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AppChat API Documentation",
      version: "1.0.0",
      description: "API documentation for the Chat Management System",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/modules/**/*.ts", "./src/modules/**/*.route.ts"], // Đường dẫn tới các file chứa JSDoc
};

export const swaggerSpec = swaggerJSDoc(options);
