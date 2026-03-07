import { SignIn } from "@clerk/clerk-react";

const SignInPage = () => {
  return (
    <div className="min-h-dvh bg-[#14181C] text-white flex flex-col items-center justify-center p-4">
      {/* Clerk Sign In Component */}
      <div className="w-full max-w-md">
        <SignIn
          routing="virtual"
          signUpUrl="/sign-up"
          forceRedirectUrl="/"
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

export default SignInPage;
