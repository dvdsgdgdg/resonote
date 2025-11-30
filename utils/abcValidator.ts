import abcjs from 'abcjs';
import { ValidationResult } from '../types';

export const validateABC = (abcCode: string): ValidationResult => {
    try {
        if (!abcjs || typeof abcjs.parseOnly !== 'function') {
             // Fallback if abcjs isn't fully ready
             return { isValid: false, errors: ["System error: abcjs parser not initialized."] };
        }

        const tune = abcjs.parseOnly(abcCode);
        
        // Casting tune to any[] to avoid TypeScript error
        if (!tune || (tune as any[]).length === 0) {
            return { isValid: false, errors: ["No valid ABC music data found."] };
        }

        const warnings = tune[0].warnings || [];
        
        const criticalErrors = warnings.map((w: any) => {
            // Convert warning object to string if necessary
            let msg = "";
            if (typeof w === 'string') {
              msg = w;
            } else if (w && typeof w.message === 'string') {
              msg = w.message;
            } else {
              msg = "Unknown syntax warning";
            }
            
            // Format better for the AI
            if (w.line) msg = `Line ${w.line}: ${msg}`;
            return msg;
        });

        // Filter to ensure we catch the 'Unknown directive' specifically as an error
        if (criticalErrors.length > 0) {
            return { isValid: false, errors: criticalErrors };
        }

        return { isValid: true, errors: [] };
    } catch (e: any) {
        return { isValid: false, errors: [e.message || "Unknown parsing error"] };
    }
};
