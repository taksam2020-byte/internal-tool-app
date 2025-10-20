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
    customerIncludeTrainees: boolean;
    reservationIncludeTrainees: boolean;
    evaluationIncludeTrainees: boolean;
    proposalIncludeTrainees: boolean;
    evaluationTargets: string[];
    isEvaluationOpen: boolean;
    evaluationMonth: string;
    evaluationDeadline: string;
}

interface SettingsContextType {
    settings: AppSettings;
    setSettings: Dispatch<SetStateAction<AppSettings>>;
    isSettingsLoaded: boolean;
    refreshKey: number;
    triggerRefresh: () => void;
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
    customerIncludeTrainees: false,
    reservationIncludeTrainees: false,
    evaluationIncludeTrainees: false,
    proposalIncludeTrainees: false,
    evaluationTargets: [],
    isEvaluationOpen: true,
    evaluationMonth: (new Date().getMonth() + 1).toString(),
    evaluationDeadline: '',
};

const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    setSettings: () => {},
    isSettingsLoaded: false,
    refreshKey: 0,
    triggerRefresh: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const triggerRefresh = () => setRefreshKey(prev => prev + 1);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await axios.get('/api/settings');
                if (response.data) {
                    setSettings(response.data);
                }
            } catch (error) {
                console.error("Failed to load settings from DB", error);
            }
            setIsSettingsLoaded(true);
        };

        fetchSettings();
    }, [refreshKey]);

    return (
        <SettingsContext.Provider value={{ settings, setSettings, isSettingsLoaded, refreshKey, triggerRefresh }}>
            {children}
        </SettingsContext.Provider>
    );
};