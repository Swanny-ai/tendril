import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUserId, fanvueEnabled, googleEnabled } from "@/lib/auth";
import { AuthForm } from "../auth-form";

export const instant = false;

export const metadata: Metadata = { title: "Create your page" };

export default async function SignupPage(props: PageProps<"/signup">) {
  if (await currentUserId()) redirect("/dashboard");
  const { u } = await props.searchParams;
  const username = typeof u === "string" ? u.slice(0, 30) : undefined;
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Create your page</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {username ? <>Grab <span className="font-medium text-foreground">/{username}</span> before someone else does.</> : "It's free, and takes about a minute."}
      </p>
      <AuthForm mode="signup" googleEnabled={googleEnabled} fanvueEnabled={fanvueEnabled} username={username} />
    </>
  );
}
