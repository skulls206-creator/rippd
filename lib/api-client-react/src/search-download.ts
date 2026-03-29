import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions, UseMutationResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { ErrorType, BodyType } from "./custom-fetch";
import type { DownloadResult, ErrorResponse } from "./generated/api.schemas";

export interface SearchDownloadRequest {
  query: string;
}

export type SearchDownloadAudioMutationError = ErrorType<ErrorResponse>;

export const searchDownloadAudio = async (
  body: BodyType<SearchDownloadRequest>,
  options?: RequestInit,
): Promise<DownloadResult> => {
  return customFetch<DownloadResult>("/api/download/search-audio", {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(body),
  });
};

export function useSearchDownloadAudio<
  TError = SearchDownloadAudioMutationError,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof searchDownloadAudio>>,
    TError,
    { data: SearchDownloadRequest },
    TContext
  >;
}): UseMutationResult<
  Awaited<ReturnType<typeof searchDownloadAudio>>,
  TError,
  { data: SearchDownloadRequest },
  TContext
> {
  const { mutation: mutationOptions } = options ?? {};

  const mutationFn = async (variables: { data: SearchDownloadRequest }) => {
    return searchDownloadAudio(variables.data);
  };

  return useMutation({ mutationFn, ...mutationOptions });
}
