import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type ProfileUpsert = TablesInsert<"profiles">;

const PROFILE_PHOTOS_BUCKET = "profile-photos";

export const fetchOwnProfile = async (userId: string) => {
  return supabase.from("profiles").select("*").eq("id", userId).single();
};

export const upsertOwnProfile = async (profile: ProfileUpsert) => {
  return supabase.from("profiles").upsert(profile, { onConflict: "id" }).select("*").single();
};

export const ensureOwnProfile = async (userId: string, fullName?: string | null) => {
  const { data: profile, error } = await fetchOwnProfile(userId);

  if (profile || (error && error.code !== "PGRST116")) {
    return { data: profile, error };
  }

  return upsertOwnProfile({
    id: userId,
    full_name: fullName?.trim() || null,
  });
};

export const uploadOwnProfilePhoto = async (userId: string, file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `${userId}/avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  const { data } = supabase.storage.from(PROFILE_PHOTOS_BUCKET).getPublicUrl(filePath);
  return { data: data.publicUrl, error: null };
};
