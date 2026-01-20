import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useNavigate } from 'react-router-dom';
import { useSignup, useUserAccessTokens } from '@/hooks/useAuthenticationMutations';

const SignupForm = () => {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");

    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [isEmailValid, setIsEmailValid] = useState(true);

    const { mutate: postAccessTokens, isLoading: isAccessTokenLoading } = useUserAccessTokens();
    const { mutate: postFormData, isLoading: isSignupLoading } = useSignup();

    const [submitError, setSubmitError] = useState(false);
    const [submitErrorText, setSubmitErrorText] = useState("");

    const showPasswordHandler = () => {
        setShowPassword((prevState) => !prevState);
    };

    const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFullName(e.target.value);
    };

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUsername(e.target.value);
        // setDomain(e.target.value + "_domain");
        setIsEmailValid(true);
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
    };

    const handlePasswordKeypress = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.code === "Enter") {
            handleSignup();
            return;
        }
    };

    const handleSignup = () => {
        const trimmedEmail = username.trim();

        if (!(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) || !trimmedEmail) {
            setIsEmailValid(false);
            return;
        }

        const normalizedEmail = trimmedEmail.toLowerCase();
        const normalizedPassword = password.trim();
        const normalizedDomain = normalizedEmail + "_domain";

        postFormData(
            {  email: normalizedEmail, password: normalizedPassword },
            {
                onSuccess: () => {
                    postAccessTokens(
                        { domain: normalizedDomain, username: normalizedEmail, password: normalizedPassword },
                        {
                            onSuccess: () => {
                                sessionStorage.setItem("showTrialModal", "true")
                                navigate("/accounts");
                            },
                            onError: () => {
                                setSubmitErrorText("Incorrect username or password");
                                setSubmitError(true);
                            },
                        },
                    );
                },
                onError: () => {
                    setSubmitErrorText("Failed to create an account. Please try again.");
                    setSubmitError(true);
                },
            },
        );
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Join <span className="text-[#5a41cd]"><a href="https://www.outflo.io/" target="_blank">OutFlo</a></span>
                </h2>
                <p className="text-gray-600">
                Create your workspace and start scaling outreach
                </p>
            </div>

            <form className="space-y-6">
                {/* Username */}
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Workspace Email
                    </Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-[#5a41cd]" />
                        <Input
                            id="Email"
                            name="Workspace Email"
                            type="text"
                            placeholder="Enter your Work Email"
                            value={username}
                            onChange={handleUsernameChange}
                            className="pl-10 py-3 rounded-xl border-[#5a41cd]/20 focus:border-[#5a41cd] focus:ring-[#5a41cd] bg-white"
                            required
                        />
                    </div>
                     {!isEmailValid && <p className='text-destructive text-sm'>Please enter a valid email address</p>}
                </div>

                {/* Password */}
                <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                        Password
                    </Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-[#5a41cd]" />
                        <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={handlePasswordChange}
                            className="pl-10 pr-10 py-3 rounded-xl border-[#5a41cd]/20 focus:border-[#5a41cd] focus:ring-[#5a41cd] bg-white"
                            required
                            onKeyDown={handlePasswordKeypress}
                        />
                        <button
                            type="button"
                            onClick={showPasswordHandler}
                            className="absolute right-3 top-3 text-[#5a41cd] hover:text-[#5a41cd]/80"
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {submitError && (
                    <div className="text-red-500 text-sm font-medium">
                        {submitErrorText}
                    </div>
                )}

                {/* Submit Button */}
                <div className='space-y-1 !mt-8'>
                    <Button
                        type="button"
                        onClick={handleSignup}
                        disabled={isSignupLoading || isAccessTokenLoading}
                        className="w-full py-3 bg-[#5a41cd] hover:bg-[#5a41cd]/90 text-white rounded-xl font-medium text-base"
                    >
                        {(isSignupLoading || isAccessTokenLoading) ? (
                            <div className="flex items-center justify-center space-x-2">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Creating Account...</span>
                            </div>
                        ) : (
                            "Start 8-days free trial"
                        )}
                    </Button>
                    <p className='text-center !mt-3 text-sm text-muted-foreground flex items-center gap-2 justify-center'>
                    <CheckCircle className="w-4 h-4 text-green-500" /> No card required
                    </p>
                </div>
            </form>
            <hr className='mt-8'/>

            {/* Toggle Link */}
            <div className="text-center mt-4 ">
                <p className="text-gray-600">
                    Already have an account?
                    <Link
                        to="/login"
                        className="text-[#5a41cd] hover:text-[#5a41cd]/80 font-medium ml-1"
                    >
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default SignupForm;
