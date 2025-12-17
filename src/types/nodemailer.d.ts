// Minimal ambient declaration for nodemailer to satisfy TypeScript
// Install `@types/nodemailer` for better typings when available.
declare module 'nodemailer' {
  const nodemailer: {
    createTransport: (options: any) => any;
  };
  export = nodemailer;
}
