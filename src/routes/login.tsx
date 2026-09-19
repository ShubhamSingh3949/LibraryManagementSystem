import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginRoute,
});

function LoginRoute() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  if (session) {
    navigate({ to: "/" });
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    } else {
      toast.success("Successfully logged in");
      navigate({ to: "/" });
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      {/* Aesthetic Background Accents */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] size-96 rounded-full bg-brand/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] size-96 rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-brand font-display text-3xl font-bold text-primary-foreground shadow-[0_8px_32px_-12px_var(--brand)]">
            V
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to the Vision Library owner console
          </p>
        </div>

        <div className="rounded-3xl border border-line bg-card/60 p-8 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.2)] backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-foreground"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-line bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/50 placeholder:text-muted-foreground/60"
                placeholder="admin@visionlibrary.com"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-2xl border border-line bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/50 placeholder:text-muted-foreground/60"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-2xl bg-brand px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="size-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
