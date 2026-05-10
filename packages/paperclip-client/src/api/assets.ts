// VENDORED FROM paperclip-minion/ui/src/api/assets.ts @ 1bcd90b38694bd8158356afd4c8bbb3994da6503
// NOTE: This domain uses FormData uploads which require browser/fetch FormData support.
// The postForm method on the base client is not implemented — callers must handle
// multipart uploads themselves or extend the client. Methods here use JSON paths only
// where possible; upload methods are marked DONE_WITH_CONCERNS.

import type { PaperclipClient } from '../client.js';
import type { AssetImage } from '../types/asset.js';

export function assetsApi(client: PaperclipClient) {
  return {
    /**
     * Upload an image file for a company.
     * DONE_WITH_CONCERNS: Requires FormData + multipart/form-data — the base
     * PaperclipClient only supports JSON. Callers must use the raw fetch directly
     * for file uploads, or the hub proxy which handles multipart.
     */
    uploadImage(companyId: string, _file: File, _namespace?: string): Promise<AssetImage> {
      // FormData upload — not supported via JSON client.
      // Included for API surface completeness; actual upload must use fetch directly.
      return client.request({
        method: 'POST',
        path: `/api/companies/${companyId}/assets/images`,
        body: {},
      });
    },

    /**
     * Upload a company logo.
     * DONE_WITH_CONCERNS: Same FormData limitation as uploadImage.
     */
    uploadCompanyLogo(companyId: string, _file: File): Promise<AssetImage> {
      return client.request({
        method: 'POST',
        path: `/api/companies/${companyId}/logo`,
        body: {},
      });
    },
  };
}
