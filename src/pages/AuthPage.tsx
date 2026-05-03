import { useEffect, useState, type FormEvent } from "react";
import {
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AuthPageMode = "sign-up" | "sign-in" | "forgot-password" | "reset-password";

interface AuthPageProps {
  variant?: "page" | "modal";
  initialMode?: AuthPageMode | null;
  onClose?: () => void;
}

const getDefaultMode = (): AuthPageMode => "sign-in";

const getFriendlyAuthError = (message: string) => {
  const normalized = message.toLowerCase();

  if (normalized.includes("password should contain at least one character of each")) {
    return "Password must include an uppercase letter, a lowercase letter, a number, and a special character.";
  }

  if (normalized.includes("user already registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }

  return message;
};

const AuthPage = ({ variant = "page", initialMode = null, onClose }: AuthPageProps) => {
  const [mode, setMode] = useState<AuthPageMode>(initialMode ?? getDefaultMode());
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  const isSignUp = mode === "sign-up";
  const isSignIn = mode === "sign-in";
  const isForgotPassword = mode === "forgot-password";
  const isResetPassword = mode === "reset-password";

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error("Please fill in all signup details.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password should be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      toast.error(getFriendlyAuthError(error.message));
      return;
    }

    if (data.session) {
      toast.success("Account created. You are now signed in.");
      return;
    }

    toast.success("Account created. Check your email, then sign in.");
    setMode("sign-in");
    setPassword("");
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Enter your email and password.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setIsSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error(getFriendlyAuthError(error.message));
      return;
    }

    const signedInEmail = data.user?.email ?? normalizedEmail;
    toast.success(`Welcome back, ${signedInEmail}.`);
  };

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error("Enter your email address.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error(getFriendlyAuthError(error.message));
      return;
    }

    toast.success("Password reset email sent. Check your inbox.");
    setMode("sign-in");
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password.trim() || !confirmPassword.trim()) {
      toast.error("Enter and confirm your new password.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password should be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      toast.error(getFriendlyAuthError(error.message));
      return;
    }

    toast.success("Password updated successfully.");
    setPassword("");
    setConfirmPassword("");
    setMode("sign-in");
    onClose?.();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (isSignUp) {
      return void handleSignUp(event);
    }

    if (isSignIn) {
      return void handleSignIn(event);
    }

    if (isForgotPassword) {
      return void handleForgotPassword(event);
    }

    return void handleResetPassword(event);
  };

  const heading = isSignUp
    ? "Start your study journey"
    : isSignIn
      ? "Welcome back"
      : isForgotPassword
        ? "Reset your password"
        : "Choose a new password";

  const subheading = isSignUp
    ? "Create your account first. We will ask about your exam and study setup inside the planner where it belongs."
    : isSignIn
      ? "Sign in to continue with your plans, journal, doubts, and mentor guidance."
      : isForgotPassword
        ? "Enter your email and we will send you a secure reset link."
        : "Set a fresh password for your account and get back to studying.";

  const content = (
    <div className="max-w-lg mx-auto w-full">
      <div className="relative overflow-hidden rounded-[2rem] bg-card shadow-card-lg border border-border">
        {variant === "modal" && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close auth"
          >
            <X size={18} />
          </button>
        )}

        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent pointer-events-none" />

        <div className="relative px-6 pt-8 pb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
            <Sparkles size={14} />
            AI Mentor
          </div>

          <div className="mt-6">
            <h1 className="text-3xl font-bold text-foreground">{heading}</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{subheading}</p>
          </div>

          {!isForgotPassword && !isResetPassword && (
            <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-accent p-1">
              <button
                type="button"
                onClick={() => setMode("sign-up")}
                className={cn(
                  "rounded-xl py-2.5 text-sm font-semibold transition-colors",
                  isSignUp ? "gradient-primary text-primary-foreground shadow-orange" : "text-muted-foreground",
                )}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => setMode("sign-in")}
                className={cn(
                  "rounded-xl py-2.5 text-sm font-semibold transition-colors",
                  isSignIn ? "gradient-primary text-primary-foreground shadow-orange" : "text-muted-foreground",
                )}
              >
                Sign In
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Full Name</label>
                  <div className="relative">
                    <UserRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Your name"
                      className="rounded-xl pl-10 h-11"
                      />
                    </div>
                  </div>
              </>
            )}

            {!isResetPassword && (
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="rounded-xl pl-10 h-11"
                  />
                </div>
              </div>
            )}

            {!isForgotPassword && (
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  {isResetPassword ? "New Password" : "Password"}
                </label>
                <div className="relative">
                  <LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={isResetPassword ? "Create a new password" : isSignUp ? "Create a password" : "Enter your password"}
                    className="rounded-xl pl-10 h-11"
                  />
                </div>
              </div>
            )}

            {(isSignUp || isResetPassword) && (
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  {isResetPassword ? "Confirm Password" : "Confirm Password"}
                </label>
                <div className="relative">
                  <LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat your new password"
                    className="rounded-xl pl-10 h-11"
                  />
                </div>
              </div>
            )}

            {isSignIn && (
              <button
                type="button"
                onClick={() => setMode("forgot-password")}
                className="text-sm text-primary font-semibold"
              >
                Forgot password?
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full gradient-primary text-primary-foreground rounded-xl py-3 font-semibold shadow-orange disabled:opacity-60"
            >
              {isSubmitting
                ? "Please wait..."
                : isSignUp
                  ? "Create Account"
                  : isSignIn
                    ? "Sign In"
                    : isForgotPassword
                      ? "Send Reset Link"
                      : "Update Password"}
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-5 leading-relaxed">
            {isSignUp
              ? "After signup, the Planner tab will ask for exam, date, subjects, and available hours before generating your starter plan."
              : isSignIn
                ? "New here? Switch to Sign Up first, then the Planner tab will collect your exam details."
                : isForgotPassword
                  ? "Remembered your password? Go back to Sign In."
                  : "Once your password is updated, you can continue straight into the app."}
          </p>

          {(isForgotPassword || isResetPassword) && (
            <button
              type="button"
              onClick={() => setMode("sign-in")}
              className="w-full mt-3 text-sm text-muted-foreground font-medium hover:text-foreground transition-colors"
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (variant === "modal") {
    return (
      <div className="fixed inset-0 z-[100] bg-background/70 backdrop-blur-sm px-4 py-8 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center">{content}</div>
      </div>
    );
  }

  return <div className="min-h-screen bg-background px-4 py-8">{content}</div>;
};

export default AuthPage;
