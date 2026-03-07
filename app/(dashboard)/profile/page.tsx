import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BrutalCard } from "@/components/ui/brutal-card";
import { BrutalInput } from "@/components/ui/brutal-input";
import { BrutalButton } from "@/components/ui/brutal-button";
import { BrutalAvatar } from "@/components/ui/brutal-avatar";
import { updateProfileAction } from "@/actions/profile";
import { SignOutButton } from "@/components/ui/sign-out-button";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="border-b border-tech-main/40 pb-6 relative">
        <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-tech-main/20 -translate-y-[1px] translate-x-[1px]"></div>
        <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tight text-tech-main-dark flex items-center">
          <span className="w-4 h-4 bg-tech-main/20 border border-tech-main/50 mr-4"></span>
          USER PROFILE
        </h1>
        <p className="text-sm font-mono tracking-[0.2em] mt-3 text-tech-main/80 flex items-center">
           <span className="w-2 h-2 rounded-full bg-tech-main mr-2 animate-pulse"></span>
           MANAGE YOUR IDENTITY
        </p>
      </div>

      <BrutalCard className="border border-tech-main/30 bg-white/60 backdrop-blur-sm p-6 md:p-8 relative">
        {/* 工业风边角 */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-tech-main -translate-x-[1px] -translate-y-[1px]"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-tech-main translate-x-[1px] translate-y-[1px]"></div>
        
        <form action={updateProfileAction} className="space-y-6 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <BrutalAvatar src={user.image} alt={user.name} size="lg" />
            <div className="flex-1 w-full">
              <label className="block text-xs font-mono tracking-widest text-tech-main-dark mb-2 uppercase">Avatar URL (Optional)</label>
              <BrutalInput 
                name="image" 
                defaultValue={user.image || ""} 
                placeholder="https://..." 
                className="font-mono text-sm border-tech-main/40 focus:border-tech-main bg-white/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono tracking-widest text-tech-main-dark mb-2 uppercase">Username</label>
            <BrutalInput 
              name="name" 
              defaultValue={user.name || ""} 
              required 
              placeholder="Your handle" 
              className="font-mono text-sm border-tech-main/40 focus:border-tech-main bg-white/50"
            />
          </div>

          <div>
            <label className="block text-xs font-mono tracking-widest text-tech-main/50 mb-2 uppercase">Email (Read Only)</label>
            <BrutalInput 
              defaultValue={user.email || ""} 
              disabled 
              className="bg-tech-main/5 text-tech-main/60 border-tech-main/20 font-mono text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-mono tracking-widest text-tech-main/50 mb-2 uppercase">Role (Read Only)</label>
            <BrutalInput 
              defaultValue={user.role || "USER"} 
              disabled 
              className="bg-tech-main/5 text-tech-main/60 border-tech-main/20 font-mono text-sm uppercase tracking-widest"
            />
          </div>

          <div className="pt-6 flex flex-col md:flex-row gap-4">
            <BrutalButton type="submit" variant="primary" className="w-full uppercase text-sm tracking-[0.1em] h-12">
              UPDATE IDENTITY
            </BrutalButton>
            <div className="w-full">
              <SignOutButton />
            </div>
          </div>
        </form>
      </BrutalCard>
    </div>
  );
}
