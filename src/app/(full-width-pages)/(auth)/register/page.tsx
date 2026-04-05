import RegisterForm from "@/components/auth/RegisterForm";

export default function Register() {
  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/wave.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.2,
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center">
        <RegisterForm />
      </div>
    </div>
  );
}
