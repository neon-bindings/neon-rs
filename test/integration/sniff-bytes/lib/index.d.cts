export type FileFormat = {
    name: string;
    shortName: string | null;
    mediaType: string;
    extension: string;
};
export declare function sniffBytes(buffer: ArrayBuffer): FileFormat;
