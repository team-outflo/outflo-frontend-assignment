import React from "react";
import SignupForm from "@/components/SignUpPage/SignUpForm";
import { Users } from "lucide-react";
import { Link } from "react-router-dom";

const SignupPage = () => {
  return (
    <div className="min-h-screen bg-[#FBFAFF] flex items-center justify-center">
      <div className="w-full mx-auto">
        <div className="min-h-screen grid lg:grid-cols-10  items-center ">
          {/* left Side - Signup Form */}
          <div className="w-full flex justify-center col-span-6">
            <div className="max-w-md mx-auto lg:mx-0 ">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                {/* Mobile Logo */}
                <div className="lg:hidden text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#5a41cd]/10 rounded-full mb-4">
                    <Users className="w-8 h-8 text-[#5a41cd]" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Welcome to{" "}
                    <span className="text-[#5a41cd]">
                      <a href="https://www.outflo.io/" target="_blank">OutFlo</a>
                    </span>
                  </h1>
                </div>

                <SignupForm />
              </div>
            </div>
          </div>
          {/* right Side - Illustration/Content */}
          {/* <div className="hidden lg:block text-center">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-[#5a41cd]/10 rounded-full mb-8">
                <a href="https://www.outflo.io/" target="_blank">
                <img src="image.png" className="w-32 h-32 text-[#5a41cd]" />
              </a>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to{" "}
              <span className="text-[#5a41cd]">
                <a href="https://www.outflo.io/" target="_blank">OutFlo</a>
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
              Streamline your outreach and connect with your audience like never
              before.
            </p>
          </div> */}
          <div className="border-gray-200 bg-[#f3f0fe] h-full flex flex-col justify-center pl-42 col-span-4 pb-4">
           <div className="pt-4 pl-6">
           <div className="flex items-center justify-center">
              <Link to="https://www.outflo.io/" target="_blank" className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                  <img
                    src="/image.png"
                    alt="OutFlo logo"
                    className="hero-image w-full rounded-full "
                  />
                </div>
                <span className="font-display text-4xl font-bold bg-gradient-to-r from-[#455eb5] via-[#5643cc] to-[#673fd7] bg-clip-text text-transparent">OutFlo AI</span>
              </Link>
            </div>
            <div className="font-display text-3xl font-medium mt-4 w-full space-y-2 text-center">
              <h1 className="">
                <span className="text-[#5643cc]">Automate</span> LinkedIn Outreach at Scale</h1>
            </div>
           </div>
            <div className="w-full mt-14 pl-32">
              <img src="https://outflo.s3.ap-south-1.amazonaws.com/public-assets/Dashboard_without++conversation.png" className="w-[1000px] h-[520px]  object-cover shadow-xl object-left  rounded-l-3xl" />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default SignupPage;
