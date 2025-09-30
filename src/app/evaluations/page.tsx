'use client';

import { useState } from 'react';
import { Form, Button, Row, Col, Card, Spinner, Modal, Alert } from 'react-bootstrap';
import { useSettings } from '@/context/SettingsContext';
import axios from 'axios';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

const evaluationItems = [
    { id: 'comprehension', label: '業務理解度' },
    { id: 'quality', label: '業務の質' },
    { id: 'quantity', label: '業務の量' },
    { id: 'responsibility', label: '責任感' },
    { id: 'cooperation', label: '協調性' },
];

const initialScores = evaluationItems.reduce((acc, item) => {
    acc[item.id] = 3; // Default score
    return acc;
}, {} as { [key: string]: number });

export default function EvaluationPage() {
    const { settings, isSettingsLoaded } = useSettings();
    const [validated, setValidated] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<{success: boolean; message: string} | null>(null);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [scores, setScores] = useState(initialScores);

    const handleScoreChange = (id: string, value: number) => {
        setScores(prevScores => ({
            ...prevScores,
            [id]: value
        }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (form.checkValidity() === false) {
            event.stopPropagation();
            setValidated(true);
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus(null);

        const formData = new FormData(form);
        const targetEmployee = formData.get('targetEmployee') as string;

        try {
            // NOTE: This is a placeholder. You'll need to create this API endpoint.
            await axios.post('/api/evaluations', {
                targetEmployee,
                scores,
                evaluationMonth: settings.evaluationMonth,
            });
            setSubmitStatus({ success: true, message: '考課を提出しました。' });
        } catch (error) {
            console.error("Evaluation submission error:", error);
            setSubmitStatus({ success: false, message: '提出に失敗しました。もう一度お試しください。' });
        } finally {
            setIsSubmitting(false);
            setShowStatusModal(true);
        }
    };

    if (!isSettingsLoaded) {
        return <div className="d-flex justify-content-center align-items-center vh-100"><Spinner animation="border" /><div>読み込み中...</div></div>;
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
                                <Form.Select required name="targetEmployee" defaultValue="">
                                    <option value="" disabled>選択してください...</option>
                                    {settings.evaluationTargets.map(target => (
                                        <option key={target} value={target}>{target}</option>
                                    ))}
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">
                                    考課対象者を選択してください。
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Row>

                        <hr />

                        {evaluationItems.map(item => (
                            <Form.Group as={Row} key={item.id} className="mb-4 align-items-center">
                                <Form.Label column sm={3} className="text-md-end">{item.label}</Form.Label>
                                <Col sm={7}>
                                    <Slider
                                        min={1}
                                        max={5}
                                        value={scores[item.id]}
                                        onChange={(value) => handleScoreChange(item.id, value as number)}
                                        className="mt-2"
                                    />
                                </Col>
                                <Col sm={2}>
                                    <span className="fw-bold fs-5">{scores[item.id]}</span>
                                </Col>
                            </Form.Group>
                        ))}

                        <div className="mt-4 d-grid">
                            <Button variant="primary" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> 送信中...</> : '提出する'}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>

            <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>提出状況</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {submitStatus && (
                        <Alert variant={submitStatus.success ? 'success' : 'danger'} className="mb-0">
                            {submitStatus.message}
                        </Alert>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
                        閉じる
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}