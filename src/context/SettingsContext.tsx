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
    customerAllowedRoles: string[];
    reservationAllowedRoles: string[];
    evaluationAllowedRoles: string[];
    proposalAllowedRoles: string[];
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
    customerAllowedRoles: [],
    reservationAllowedRoles: [],
    evaluationAllowedRoles: [],
    proposalAllowedRoles: [],
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

import axios from 'axios';

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await axios.get('/api/settings');
                if (response.data && Object.keys(response.data).length > 0) {
                    // Merge fetched settings with defaults to ensure all keys are present
                    setSettings(prev => ({ ...prev, ...response.data }));
                }
            } catch (error) {
                console.error("Failed to load settings from database", error);
            }
            setIsSettingsLoaded(true);
        };

        fetchSettings();
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, setSettings, isSettingsLoaded }}>
            {children}
        </SettingsContext.Provider>
    );
};
