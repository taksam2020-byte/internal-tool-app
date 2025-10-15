'use client';

import { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';
import axios from 'axios';

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
    // New settings for including trainees
    customerIncludeTrainees: boolean;
    reservationIncludeTrainees: boolean;
    evaluationIncludeTrainees: boolean;
    proposalIncludeTrainees: boolean;
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
    // Defaults for new trainee inclusion settings
    customerIncludeTrainees: false,
    reservationIncludeTrainees: false,
    evaluationIncludeTrainees: false,
    proposalIncludeTrainees: false,
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
        const fetchSettings = async () => {
            try {
                const response = await axios.get('/api/settings');
                if (response.data) {
                    setSettings(prev => ({ ...prev, ...response.data }));
                }
            } catch (error) {
                if (axios.isAxiosError(error) && error.response?.status === 404) {
                    // This is expected if no settings are in the DB yet. 
                    // The component will use defaultSettings.
                } else {
                    console.error("Failed to load settings from database", error);
                }
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