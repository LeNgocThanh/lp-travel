declare module "mammoth/mammoth.browser" {
  type ConvertResult = {
    value: string;
    messages: Array<{ type: string; message: string }>;
  };

  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<ConvertResult>;
}
