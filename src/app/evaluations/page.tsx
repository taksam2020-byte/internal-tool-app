'use client';

import { useState } from 'react';
import { Form, Button, Row, Col, Card, Spinner, Modal, Alert } from 'react-bootstrap';
import { useSettings } from '@/context/SettingsContext';
import axios from 'axios';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

// ... (evaluationItems, initialScores etc. are the same)

export default function EvaluationPage() {
    const { settings, isSettingsLoaded } = useSettings();
    const [validated, setValidated] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<{success: boolean; message: string} | null>(null);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [scores, setScores] = useState(initialScores);

    // ... (handleScoreChange and handleSubmit are the same for now)

    if (!isSettingsLoaded) {
        return <div>読み込み中...</div>;
    }

    if (!settings.isEvaluationOpen) {
        return (
            <div>
                <h1 className="mb-4">新人考課</h1>
                <Alert variant="warning">現在、新人考課は受け付けていません。</Alert>
            </div>
        );
    }

    return (
        <div>
            <h1 className="mb-4">{settings.evaluationMonth}月度 新人考課</h1>
            <Card>
                <Card.Body>
                    <Form noValidate validated={validated} onSubmit={handleSubmit}>
                        <Row className="mb-3">
                            <Form.Group as={Col} md={6}>
                                <Form.Label>考課対象者<span className="text-danger">*</span></Form.Label>
                                <Form.Select required name="targetEmployee">
                                    <option value="">選択してください...</option>
                                    {settings.evaluationTargets.map(target => (
                                        <option key={target} value={target}>{target}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                            {/* ... rest of the form ... */}
                        </Row>
                        {/* ... rest of the component ... */}
                    </Form>
                </Card.Body>
            </Card>
            {/* ... modal ... */}
        </div>
    );
}