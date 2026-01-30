import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface BackButtonProps {
    to?: string;
    label?: string;
    className?: string;
    variant?: 'dark' | 'light';
}

const BackButton: React.FC<BackButtonProps> = ({
    to,
    label = "Back",
    className = "",
    variant = "light"
}) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (to) {
            navigate(to);
        } else {
            // Fallback to home if history is empty (e.g. direct deep link)
            if (window.history.length <= 1) {
                navigate('/');
            } else {
                navigate(-1);
            }
        }
    };

    const isLight = variant === "light";

    return (
        <motion.button
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all
                ${isLight
                    ? "bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-sm"
                }
                ${className}
            `}
        >
            <ArrowLeft size={18} strokeWidth={3} />
            {label}
        </motion.button>
    );
};

export default BackButton;
