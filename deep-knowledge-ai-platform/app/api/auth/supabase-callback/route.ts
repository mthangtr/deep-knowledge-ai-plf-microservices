import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");

  // Check for fragment-based tokens (modern Supabase Auth)
  const access_token = searchParams.get("access_token");
  const refresh_token = searchParams.get("refresh_token");



  // Xử lý lỗi từ Supabase
  if (error) {
    console.error(
      "❌ [AUTH ERROR] Supabase auth error:",
      error,
      error_description
    );
    return NextResponse.redirect(
      new URL(
        `/signin?error=callback_error&message=${encodeURIComponent(
          error_description || error
        )}`,
        request.url
      )
    );
  }

  // Kiểm tra có code hoặc access_token
  if (!code && !access_token) {
    console.error(
      "❌ [AUTH ERROR] Missing both code and access_token in callback"
    );
    return NextResponse.redirect(
      new URL("/signin?error=missing_auth_params", request.url)
    );
  }

  try {
    const supabase = createServerClient();
    let supabaseUser;


    if (code) {
      // Flow cũ: đổi code thành session
      const { data: authData, error: authError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (authError || !authData.user) {
        console.error(
          "❌ [AUTH ERROR] Error exchanging code for session:",
          authError
        );
        return NextResponse.redirect(
          new URL("/signin?error=exchange_failed", request.url)
        );
      }

      supabaseUser = authData.user;
    } else if (access_token && refresh_token) {
      // Flow mới: set session từ tokens
      const { data: authData, error: authError } =
        await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

      if (authError || !authData.user) {
        console.error(
          "❌ [AUTH ERROR] Error setting session from tokens:",
          authError
        );
        return NextResponse.redirect(
          new URL("/signin?error=session_failed", request.url)
        );
      }

      supabaseUser = authData.user;
    } else {
      console.error(
        "❌ [AUTH ERROR] Neither code nor tokens available for authentication"
      );
      return NextResponse.redirect(
        new URL("/signin?error=no_auth_method", request.url)
      );
    }


    // Kiểm tra xem user profile đã tồn tại chưa
    const { data: existingProfile, error: fetchError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", supabaseUser.id)
      .single();

    let userProfile;

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("❌ [DB ERROR] Error fetching user profile:", fetchError);
      return NextResponse.redirect(
        new URL("/signin?error=database_error", request.url)
      );
    }

    if (existingProfile) {
      // Profile đã tồn tại, cập nhật thông tin
      const { data: updatedProfile, error: updateError } = await supabase
        .from("user_profiles")
        .update({
          full_name:
            supabaseUser.user_metadata?.full_name ||
            supabaseUser.user_metadata?.name ||
            existingProfile.full_name,
          name:
            supabaseUser.user_metadata?.full_name ||
            supabaseUser.user_metadata?.name ||
            existingProfile.name,
          avatar_url:
            supabaseUser.user_metadata?.avatar_url ||
            supabaseUser.user_metadata?.picture ||
            existingProfile.avatar_url,
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProfile.id)
        .select()
        .single();

      if (updateError) {
        console.error(
          "❌ [DB ERROR] Error updating user profile:",
          updateError
        );
        return NextResponse.redirect(
          new URL("/signin?error=update_failed", request.url)
        );
      }

      userProfile = updatedProfile;
    } else {
      // Profile chưa tồn tại, tạo mới
      const provider = supabaseUser.app_metadata?.provider || "magic_link";

      const { data: newProfile, error: createError } = await supabase
        .from("user_profiles")
        .insert({
          id: supabaseUser.id,
          email: supabaseUser.email!,
          full_name:
            supabaseUser.user_metadata?.full_name ||
            supabaseUser.user_metadata?.name,
          name:
            supabaseUser.user_metadata?.full_name ||
            supabaseUser.user_metadata?.name,
          avatar_url:
            supabaseUser.user_metadata?.avatar_url ||
            supabaseUser.user_metadata?.picture,
          provider: provider as "magic_link" | "google" | "github",
          last_login_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error(
          "❌ [DB ERROR] Error creating user profile:",
          createError
        );
        return NextResponse.redirect(
          new URL("/signin?error=create_failed", request.url)
        );
      }

      userProfile = newProfile;
    }

    // Tạo user data để gửi đến backend
    const userData = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      image: userProfile.avatar_url,
      user_metadata: {
        name: userProfile.name,
        avatar_url: userProfile.avatar_url,
      },
    };


    try {
      // Gọi backend để tạo JWT token
      const backendUrl = `${
        process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8080"
      }/api/auth/supabase-callback`;


      const backendResponse = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userData }),
      });



      if (!backendResponse.ok) {
        const errorData = await backendResponse.text();
        console.error("❌ [BACKEND ERROR] Backend auth error:", {
          status: backendResponse.status,
          error: errorData,
        });
        return NextResponse.redirect(
          new URL("/signin?error=backend_auth_failed", request.url)
        );
      }

      const responseData = await backendResponse.json();


      const { token, user } = responseData;

      if (!token) {
        console.error("❌ [BACKEND ERROR] No JWT token received from backend");
        return NextResponse.redirect(
          new URL("/signin?error=no_jwt_token", request.url)
        );
      }

      // Redirect đến signin success page với user data để NextAuth xử lý
      const successUrl = new URL("/signin/callback", request.url);
      successUrl.searchParams.set("user", JSON.stringify(user));
      successUrl.searchParams.set("token", token);



      return NextResponse.redirect(successUrl);
    } catch (backendError) {
      console.error(
        "❌ [BACKEND ERROR] Error calling backend auth:",
        backendError
      );
      return NextResponse.redirect(
        new URL("/signin?error=backend_connection_failed", request.url)
      );
    }
  } catch (error) {
    console.error(
      "❌ [UNEXPECTED ERROR] Unexpected error in auth callback:",
      error
    );
    return NextResponse.redirect(
      new URL("/signin?error=unexpected_error", request.url)
    );
  }
}
