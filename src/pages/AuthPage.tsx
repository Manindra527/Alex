import { useEffect, useState, type FormEvent } from "react";
import {
LockKeyhole,
Mail,
Sparkles,
UserRound,
X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { startAuthSession } from "@/lib/authSession";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AuthPageMode = "sign-up" | "sign-in";

interface AuthPageProps {
variant?: "page" | "modal";
initialMode?: AuthPageMode | null;
onClose?: () => void;
}

const getDefaultMode = (): AuthPageMode => "sign-in";

const AuthPage = ({ variant = "page", initialMode = null, onClose }: AuthPageProps) => {
const [mode, setMode] = useState<AuthPageMode>(initialMode ?? getDefaultMode());
const [fullName, setFullName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);

useEffect(() => {
if (initialMode) setMode(initialMode);
}, [initialMode]);

const isSignUp = mode === "sign-up";
const isSignIn = mode === "sign-in";

/* ================= SIGN UP ================= */
const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
event.preventDefault();

if (!fullName || !email || !password || !confirmPassword) {
toast.error("Fill all fields");
return;
}

if (password !== confirmPassword) {
toast.error("Passwords do not match");
return;
}

setIsSubmitting(true);

try {
const data = await api("/auth/signup", {
method: "POST",
body: {
full_name: fullName,
email,
password,
},
});

localStorage.setItem(
"ai-mentor-auth",
JSON.stringify({
access_token: data.token,
user: data.user,
})
);

startAuthSession();
toast.success("Account created");
} catch (e: any) {
toast.error(e.message);
}

setIsSubmitting(false);


};

/* ================= SIGN IN ================= */
const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
event.preventDefault();

if (!email || !password) {
toast.error("Enter email & password");
return;
}

setIsSubmitting(true);

try {
const data = await api("/auth/login", {
method: "POST",
body: {
email,
password,
},
});

localStorage.setItem(
"ai-mentor-auth",
JSON.stringify({
access_token: data.token,
user: data.user,
})
);

startAuthSession();
toast.success("Login success");
} catch (e: any) {
toast.error(e.message);
}

setIsSubmitting(false);

};

const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
if (isSignUp) return void handleSignUp(event);
return void handleSignIn(event);
};

const content = ( <div className="max-w-lg mx-auto w-full"> <div className="rounded-2xl bg-card p-6 shadow"> <h1 className="text-2xl font-bold mb-4">
{isSignUp ? "Create Account" : "Sign In"} </h1>

<div className="flex gap-2 mb-4">
<button onClick={() => setMode("sign-up")}>Sign Up</button>
<button onClick={() => setMode("sign-in")}>Sign In</button>
</div>

<form onSubmit={handleSubmit} className="space-y-3">
{isSignUp && (
<Input
placeholder="Full Name"
value={fullName}
onChange={(e) => setFullName(e.target.value)}
/>
)}

<Input
placeholder="Email"
value={email}
onChange={(e) => setEmail(e.target.value)}
/>

<Input
type="password"
placeholder="Password"
value={password}
onChange={(e) => setPassword(e.target.value)}
/>

{isSignUp && (
<Input
type="password"
placeholder="Confirm Password"
value={confirmPassword}
onChange={(e) => setConfirmPassword(e.target.value)}
/>
)}

<button type="submit" className="w-full bg-primary text-white py-2 rounded">
{isSubmitting ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
</button>
</form>
</div>
</div>


);

return variant === "modal" ? ( <div className="fixed inset-0 flex items-center justify-center">{content}</div>
) : ( <div className="min-h-screen flex items-center justify-center">{content}</div>
);
};

export default AuthPage;
