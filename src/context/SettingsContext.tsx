'use client';

import { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';

const SETTINGS_KEY = 'appSettings';

export interface AppSettings {
    customerEmails: string[];
    reservationEmails: string[];
    proposalEmails: string[];
    isProposalOpen: boolean;
    proposalDeadline: string;
    proposalYear: string;
    // New settings for evaluations
    evaluationTargets: string[];
    isEvaluationOpen: boolean;
    evaluationMonth: string;
    evaluationDeadline: string;
}

interface SettingsContextType {
    settings: AppSettings;
    setSettings: Dispatch<SetStateAction<AppSettings>>;
    isSettingsLoaded: boolean;
}

const defaultSettings: AppSettings = {
    customerEmails: [],
    reservationEmails: [],
    proposalEmails: [],
    isProposalOpen: true,
    proposalDeadline: '',
    proposalYear: new Date().getFullYear().toString(),
    // Defaults for new settings
    evaluationTargets: [],
    isEvaluationOpen: true,
    evaluationMonth: (new Date().getMonth() + 1).toString(),
    evaluationDeadline: '',
};

const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    setSettings: () => {},
    isSettingsLoaded: false,
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem(SETTINGS_KEY);
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                // Ensure array fields exist for backward compatibility
                parsed.customerEmails = Array.isArray(parsed.customerEmails) ? parsed.customerEmails : [];
                parsed.reservationEmails = Array.isArray(parsed.reservationEmails) ? parsed.reservationEmails : [];
                parsed.proposalEmails = Array.isArray(parsed.proposalEmails) ? parsed.proposalEmails : [];
                parsed.evaluationTargets = Array.isArray(parsed.evaluationTargets) ? parsed.evaluationTargets : [];
                setSettings(prev => ({ ...prev, ...parsed }));
            }
        } catch (error) {
            console.error("Failed to load settings from localStorage", error);
        }
        setIsSettingsLoaded(true);
    }, []);

    useEffect(() => {
        if (isSettingsLoaded) {
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            } catch (error) {
                console.error("Failed to save settings to localStorage", error);
            }
        }
    }, [settings, isSettingsLoaded]);

    return (
        <SettingsContext.Provider value={{ settings, setSettings, isSettingsLoaded }}>
            {children}
        </SettingsContext.Provider>
    );
};
