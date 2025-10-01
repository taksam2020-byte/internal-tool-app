'use client';

import { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Card, Spinner, Modal, Alert } from 'react-bootstrap';
import { useSettings } from '@/context/SettingsContext';
import axios from 'axios';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

interface User {
    id: number;
    name: string;
}

const evaluationItems = [
    { id: 'accuracy', label: '正確性', description: '仕事は、正確に・迅速に処理する能力を有しているか。同じミスを繰り返していないか。', maxScore: 5 },
    { id: 'discipline', label: '規律性', description: '正当な事由以外の、遅刻・早退・欠勤は無かったか。職場の規律を乱す行為は無かったか。', maxScore: 5 },
    { id: 'cooperation', label: '協調性', description: '協調する気持ちを有しているか。 常識を逸脱した自己主張がないか。', maxScore: 5 },
    { id: 'proactiveness', label: '積極性', description: '職務知識に関する吸収意欲があるか。どんな仕事でも積極的に引き受ける意欲が見えたか。', maxScore: 5 },
    { id: 'agility', label: '俊敏性', description: '動作が緩慢ではなく、相手の問いかけやリクエストに対して即座に反応してテキパキと行動できているか。', maxScore: 5 },
    { id: 'judgment', label: '判断力', description: '状況を正しく判断し、速やかに適切に対処する能力は。不明なことはすぐに質問し、不明なまま放置していないか。', maxScore: 5 },
    { id: 'expression', label: '表現力', description: '業務上の報告・連絡・相談が、正確にわかりやすく、 口頭・書面で表現出来る能力を有しているか。', maxScore: 5 },
    { id: 'comprehension', label: '理解力', description: '商品知識・業務の流れ等、日常業務の理解力はどうか。', maxScore: 5 },
    { id: 'interpersonal', label: '対人性', description: '職場での挨拶は、明るく笑顔で好感をもてるか。服装・礼儀作法・言葉遣いは、好感をもてるか。', maxScore: 5 },
    { id: 'potential', label: '将来性', description: '将来的に営業職もしくは事務職としてタクサムの中核社員となり得る素質は有しているか、総合判断してください。', maxScore: 10 },
];

const initialScores = evaluationItems.reduce((acc, item) => {
    acc[item.id] = Math.ceil(item.maxScore / 2); // Set default to middle score
    return acc;
}, {} as { [key: string]: number });

export default function EvaluationPage() {
    const { settings, isSettingsLoaded } = useSettings();
    const [users, setUsers] = useState<User[]>([]);
    const [validated, setValidated] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<{success: boolean; message: string} | null>(null);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [scores, setScores] = useState(initialScores);
    const [comment, setComment] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await axios.get('/api/users');
                setUsers(res.data);
            } catch (err) {
                console.error("Failed to fetch users", err);
                // Optionally, show an error to the user
            }
        };
        fetchUsers();
    }, []);

    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const maxTotalScore = evaluationItems.reduce((sum, item) => sum + item.maxScore, 0);

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
        const evaluator = formData.get('evaluator') as string;

        try {
            await axios.post('/api/evaluations', {
                targetEmployee,
                evaluator,
                scores,
                comment,
                totalScore,
                evaluationMonth: settings.evaluationMonth,
            });
            setSubmitStatus({ success: true, message: '考課を提出しました。' });
            // Reset form state after successful submission
            setScores(initialScores);
            setComment('');
            setValidated(false);
            // Note: You might want to reset the targetEmployee select as well, which requires more complex state management if it's a controlled component.
        } catch (error: unknown) {
            console.error("Evaluation submission error:", error);
            let errorMessage = '提出に失敗しました。もう一度お試しください。';
            if (axios.isAxiosError(error) && error.response) {
                errorMessage = error.response.data.error || errorMessage;
            }
            setSubmitStatus({ success: false, message: errorMessage });
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
                            <Form.Group as={Col} md={6}>
                                <Form.Label>回答者<span className="text-danger">*</span></Form.Label>
                                <Form.Select required name="evaluator" defaultValue="">
                                    <option value="" disabled>選択してください...</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.name}>{user.name}</option>
                                    ))}
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">
                                    回答者を選択してください。
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Row>

                        <hr />

                        {evaluationItems.map(item => {
                            const isMax10 = item.maxScore === 10;
                            const marks: { [key: number]: React.ReactNode } = {};
                            for (let i = 1; i <= item.maxScore; i++) {
                                marks[i] = i.toString();
                            }

                            return (
                                <Form.Group key={item.id} className="mb-5">
                                    <div>
                                        <Form.Label><strong>{item.label}</strong></Form.Label>
                                        <p className="text-muted small">{item.description}</p>
                                    </div>
                                    <Row className="align-items-center">
                                        <Col xs={10}>
                                            <Slider
                                                min={1}
                                                max={item.maxScore}
                                                marks={marks}
                                                value={scores[item.id]}
                                                onChange={(value) => handleScoreChange(item.id, value as number)}
                                                className="mt-2"
                                                trackStyle={{ backgroundColor: isMax10 ? '#ff8c00' : '#0d6efd', height: 10 }}
                                                railStyle={{ height: 10 }}
                                                handleStyle={{
                                                    borderColor: isMax10 ? '#ff8c00' : '#0d6efd',
                                                    height: 20,
                                                    width: 20,
                                                    marginTop: -5,
                                                }}
                                            />
                                        </Col>
                                        <Col xs={2} className="text-center">
                                            <span className="fw-bold fs-4">{scores[item.id]}</span>
                                        </Col>
                                    </Row>
                                </Form.Group>
                            );
                        })}

                        <hr />

                        <div className="text-center my-4">
                            <h4>合計点: <span className="fw-bold display-4">{totalScore}</span> / {maxTotalScore}</h4>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label>コメント<span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={5}
                                placeholder="出来るだけ詳細に記入してください。"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                required
                            />
                            <Form.Control.Feedback type="invalid">
                                コメントを入力してください。
                            </Form.Control.Feedback>
                        </Form.Group>


                        <div className="mt-4 d-grid">
                            <Button variant="primary" type="submit" disabled={isSubmitting} size="lg">
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