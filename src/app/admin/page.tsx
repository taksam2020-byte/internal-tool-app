'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Button, Card, Row, Col, Alert, InputGroup } from 'react-bootstrap';
import { useSettings, AppSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import * as XLSX from 'xlsx';

// Generic component for editing a list of strings
function StringListEditor({ title, list, setList, placeholder }: { title: string, list: string[], setList: (list: string[]) => void, placeholder: string }) {
    const handleItemChange = (index: number, value: string) => {
        const newList = [...list];
        newList[index] = value;
        setList(newList);
    };

    const addItemField = () => {
        setList([...list, '']);
    };

    const removeItemField = (index: number) => {
        setList(list.filter((_, i) => i !== index));
    };

    return (
        <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={3}>{title}</Form.Label>
            <Col sm={9}>
                {list.map((item, index) => (
                    <InputGroup key={index} className="mb-2">
                        <Form.Control
                            type="text"
                            value={item}
                            onChange={(e) => handleItemChange(index, e.target.value)}
                            placeholder={placeholder}
                        />
                        <Button variant="outline-danger" onClick={() => removeItemField(index)}>削除</Button>
                    </InputGroup>
                ))}
                <Button variant="outline-secondary" size="sm" onClick={addItemField}>+ 追加</Button>
            </Col>
        </Form.Group>
    );
}

export default function AdminPage() {
    const { settings, setSettings, isSettingsLoaded } = useSettings();
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const [showSuccess, setShowSuccess] = useState(false);
    const [exportYear, setExportYear] = useState(new Date().getFullYear().toString());

    useEffect(() => {
        if (isSettingsLoaded && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, isSettingsLoaded, router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const target = e.target as HTMLInputElement;
        if (target.type === 'checkbox') {
            setSettings(prev => ({ ...prev, [name]: target.checked }));
        } else {
            setSettings(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = () => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const handleExportProposals = () => { /* ... as before ... */ };

    if (!isSettingsLoaded || !isAuthenticated) {
        return <div>読み込み中...</div>;
    }

    return (
        <div>
            <h1 className="mb-4">管理画面</h1>
            {showSuccess && <Alert variant="success">設定は自動的に保存されました。</Alert>}
            <Card className="mb-4">
                <Card.Header as="h5">通知先メールアドレス設定</Card.Header>
                <Card.Body>
                    <StringListEditor title="得意先登録" list={settings.customerEmails} setList={(emails) => setSettings(s => ({...s, customerEmails: emails}))} placeholder="name@example.com" />
                    <StringListEditor title="施設予約" list={settings.reservationEmails} setList={(emails) => setSettings(s => ({...s, reservationEmails: emails}))} placeholder="name@example.com" />
                    <StringListEditor title="催事提案" list={settings.proposalEmails} setList={(emails) => setSettings(s => ({...s, proposalEmails: emails}))} placeholder="name@example.com" />
                </Card.Body>
            </Card>

            <Card className="mb-4">
                <Card.Header as="h5">催事提案フォーム設定</Card.Header>
                {/* ... proposal settings ... */}
            </Card>

            <Card className="mb-4">
                <Card.Header as="h5">新人考課設定</Card.Header>
                <Card.Body>
                    <StringListEditor title="考課対象者" list={settings.evaluationTargets} setList={(targets) => setSettings(s => ({...s, evaluationTargets: targets}))} placeholder="対象者名" />
                    <Form.Group as={Row} className="mb-3">
                        <Form.Label column sm={3}>受付状況</Form.Label>
                        <Col sm={9}>
                            <Form.Check type="switch" name="isEvaluationOpen" label={settings.isEvaluationOpen ? "受付中" : "停止中"} checked={settings.isEvaluationOpen} onChange={handleInputChange} />
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} className="mb-3">
                        <Form.Label column sm={3}>対象月度</Form.Label>
                        <Col sm={9}>
                            <Form.Select name="evaluationMonth" value={settings.evaluationMonth} onChange={handleInputChange}>
                                {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{i+1}月</option>)}
                            </Form.Select>
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} className="mb-3">
                        <Form.Label column sm={3}>締切日</Form.Label>
                        <Col sm={9}>
                            <Form.Control type="date" name="evaluationDeadline" value={settings.evaluationDeadline || ''} onChange={handleInputChange} />
                        </Col>
                    </Form.Group>
                     <hr />
                    <Form.Group as={Row} className="mb-3">
                        <Form.Label column sm={3}>集計・分析</Form.Label>
                        <Col sm={9}>
                            <Button variant="info">集計データを表示</Button>
                        </Col>
                    </Form.Group>
                </Card.Body>
            </Card>

            <div className="mt-4 d-grid">
                <Button variant="primary" size="lg" onClick={handleSave}>すべての設定を保存</Button>
            </div>
        </div>
    );
}