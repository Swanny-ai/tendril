"use client";

import { useRef, useState } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updateProfileAction, uploadAvatarAction } from "./actions";
import { queueSave, runSave, useEditor, type EditorProfile } from "./store";

export function ProfilePanel() {
  const profile = useEditor((s) => s.profile);
  const setProfile = useEditor((s) => s.setProfile);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function change(patch: Partial<EditorProfile>) {
    setProfile(patch);
    queueSave(
      "profile",
      () => {
        const p = useEditor.getState().profile;
        return updateProfileAction({
          displayName: p.displayName,
          bio: p.bio,
          seoTitle: p.seoTitle,
          seoDescription: p.seoDescription,
          published: p.published,
        });
      },
      (m) => toast.error(m),
    );
  }

  async function upload(form: FormData) {
    setUploading(true);
    await runSave(async () => {
      const res = await uploadAvatarAction(form);
      if (res.ok) setProfile({ avatarUrl: res.data?.url ?? null });
      return res;
    }, (m) => toast.error(m));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>What visitors see at the top of your page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="size-20 shrink-0 overflow-hidden rounded-full border bg-muted">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt="Your profile photo" className="size-full object-cover" />
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                id="avatar-file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const fd = new FormData();
                  fd.set("file", f);
                  void upload(fd);
                }}
              />
              <Button variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <ImageUp /> {uploading ? "Uploading…" : profile.avatarUrl ? "Change photo" : "Upload photo"}
              </Button>
              {profile.avatarUrl ? (
                <Button
                  variant="ghost"
                  disabled={uploading}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("remove", "1");
                    void upload(fd);
                  }}
                >
                  <Trash2 /> Remove
                </Button>
              ) : null}
              <p className="w-full text-xs text-muted-foreground">JPG, PNG, WebP or GIF, up to 2 MB.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" value={profile.displayName} maxLength={60} onChange={(e) => change({ displayName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label htmlFor="bio">Bio</Label>
              <span className="text-xs text-muted-foreground">{profile.bio.length}/160</span>
            </div>
            <Textarea id="bio" rows={3} value={profile.bio} maxLength={160} onChange={(e) => change({ bio: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visibility and search</CardTitle>
          <CardDescription>Control how your page appears in search results and link previews.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label htmlFor="published">Page is public</Label>
              <p className="text-sm text-muted-foreground">Turn off to hide your page from everyone.</p>
            </div>
            <Switch id="published" aria-label="Page is public" checked={profile.published} onCheckedChange={(v) => change({ published: v })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seoTitle">Search title</Label>
            <Input id="seoTitle" placeholder={profile.displayName || "Your name"} value={profile.seoTitle} maxLength={70} onChange={(e) => change({ seoTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seoDescription">Search description</Label>
            <Textarea
              id="seoDescription"
              rows={2}
              placeholder={profile.bio || "A short description for search engines"}
              value={profile.seoDescription}
              maxLength={160}
              onChange={(e) => change({ seoDescription: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
