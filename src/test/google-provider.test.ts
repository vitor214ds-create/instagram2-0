import { describe,it,expect,vi } from "vitest";
import { checkGoogleProviderStatus,parseGoogleProviderStatus } from "@/lib/google-provider";

describe("Google sign-in configuration",()=>{
  it("recognizes enabled Google provider",()=>expect(parseGoogleProviderStatus({external:{google:true}})).toBe("enabled"));
  it("recognizes disabled Google provider",()=>expect(parseGoogleProviderStatus({external:{google:false}})).toBe("disabled"));
  it("does not assume provider enabled on unexpected settings",()=>expect(parseGoogleProviderStatus({})).toBe("unavailable"));
  it("prevents a redirect when settings indicate Google is disabled",async()=>{
    const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({external:{google:false}})});
    const status=await checkGoogleProviderStatus("https://example.supabase.co","sb_publishable_test",{fetcher});
    expect(status).toBe("disabled");
    expect(fetcher).toHaveBeenCalledWith("https://example.supabase.co/auth/v1/settings",expect.objectContaining({method:"GET"}));
  });
  it("treats network errors as unavailable rather than showing a broken Google login",async()=>{
    const fetcher=vi.fn().mockRejectedValue(new Error("offline"));
    expect(await checkGoogleProviderStatus("https://example.supabase.co","sb_publishable_test",{fetcher})).toBe("unavailable");
  });
});
