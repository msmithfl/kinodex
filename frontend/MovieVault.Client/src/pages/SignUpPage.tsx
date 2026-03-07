import { SignUp } from "@clerk/clerk-react";

const SignUpPage = () => {
  return (
    <div className="min-h-dvh bg-[#14181C] text-white flex flex-col items-center justify-center p-4">
      {/* Clerk Sign Up Component */}
      <div className="w-full max-w-md">
        <SignUp
          routing="virtual"
          signInUrl="/sign-in"
          forceRedirectUrl="/profile"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white/10 backdrop-blur-sm border border-white/20",
            },
          }}
        />
      </div>
    </div>
  );
};

export default SignUpPage;
