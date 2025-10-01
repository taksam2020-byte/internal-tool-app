'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Form, Button, Card, Row, Col, Alert, InputGroup, ListGroup, Spinner, Modal } from 'react-bootstrap';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

// --- User Management Component ---
interface User {
  id: number;
  name: string;
}

function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [newUserName, setNewUserName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/users');
            setUsers(res.data);
        } catch (err) {
            setError('ユーザーの読み込みに失敗しました。');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserName.trim()) {
            setError('ユーザー名を入力してください。');
            return;
        }
        try {
            setError('');
            await axios.post('/api/users', { name: newUserName.trim() });
            setNewUserName('');
            await fetchUsers(); // Refresh the list
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                setError(err.response.data.message || 'ユーザーの追加に失敗しました。');
            } else {
                setError('予期せぬエラーが発生しました。');
            }
            console.error(err);
        }
    };

    const handleDeleteUser = async (userId: number, userName: string) => {
        if (window.confirm(`本当に「${userName}」を削除しますか？`)) {
            try {
                setError('');
                await axios.delete(`/api/users/${userId}`);
                await fetchUsers(); // Refresh the list
            } catch (err) {
                setError('ユーザーの削除に失敗しました。');
                console.error(err);
            }
        }
    };

    return (
        <Card className="mb-4">
            <Card.Header as="h5">ユーザー管理</Card.Header>
            <Card.Body>
                <p className="text-muted">各フォームの氏名選択肢に表示されるユーザーを管理します。</p>
                {error && <Alert variant="danger">{error}</Alert>}
                {loading ? (
                    <div className="text-center"><Spinner animation="border" /></div>
                ) : (
                    <ListGroup className="mb-3">
                        {users.map(user => (
                            <ListGroup.Item key={user.id} className="d-flex justify-content-between align-items-center">
                                {user.name}
                                <Button variant="outline-danger" size="sm" onClick={() => handleDeleteUser(user.id, user.name)}>削除</Button>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                )}
                <Form onSubmit={handleAddUser}>
                    <InputGroup>
                        <Form.Control
                            type="text"
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            placeholder="新しいユーザー名"
                        />
                        <Button type="submit" variant="outline-primary">追加</Button>
                    </InputGroup>
                </Form>
            </Card.Body>
        </Card>
    );
}


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
    const [showSuccessModal, setShowSuccessModal] = useState(false);

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
        // The useSettings context automatically saves on change.
        // This button just provides user feedback.
        setShowSuccessModal(true);
    };


    if (!isSettingsLoaded || !isAuthenticated) {
        return <div>読み込み中...</div>;
    }

    return (
        <div>
            <h1 className="mb-4">管理画面</h1>
            
            <UserManagement />

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
                <Card.Body>
                    <Form.Group as={Row} className="mb-3">
                        <Form.Label column sm={3}>受付状況</Form.Label>
                        <Col sm={9}>
                            <Form.Check
                                type="switch"
                                name="isProposalOpen"
                                label={settings.isProposalOpen ? "受付中" : "停止中"}
                                checked={settings.isProposalOpen}
                                onChange={handleInputChange}
                            />
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} className="mb-3">
                        <Form.Label column sm={3}>提案年度</Form.Label>
                        <Col sm={9}>
                            <Form.Control
                                type="number"
                                name="proposalYear"
                                value={settings.proposalYear}
                                onChange={handleInputChange}
                            />
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} className="mb-3">
                        <Form.Label column sm={3}>締切日</Form.Label>
                        <Col sm={9}>
                            <Form.Control
                                type="date"
                                name="proposalDeadline"
                                value={settings.proposalDeadline || ''}
                                onChange={handleInputChange}
                            />
                        </Col>
                    </Form.Group>
                </Card.Body>
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
                            <Link href="/admin/analytics" passHref legacyBehavior>
                                <Button as="a" variant="info">集計データを表示</Button>
                            </Link>
                        </Col>
                    </Form.Group>
                </Card.Body>
            </Card>

            <div className="mt-4 d-grid">
                <Button variant="primary" size="lg" onClick={handleSave}>すべての設定を保存</Button>
            </div>

            <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>保存完了</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="success" className="mb-0">
                        設定は自動的に保存されました。
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSuccessModal(false)}>
                        閉じる
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );

            <Card className="mb-4">
                <Card.Header as="h5">催事提案フォーム設定</Card.Header>
                <Card.Body>
                    <Form.Group as={Row} className="mb-3">
                        <Form.Label column sm={3}>受付状況</Form.Label>
                        <Col sm={9}>
                            <Form.Check
                                type="switch"
                                name="isProposalOpen"
                                label={settings.isProposalOpen ? "受付中" : "停止中"}
                                checked={settings.isProposalOpen}
                                onChange={handleInputChange}
                            />
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} className="mb-3">
                        <Form.Label column sm={3}>提案年度</Form.Label>
                        <Col sm={9}>
                            <Form.Control
                                type="number"
                                name="proposalYear"
                                value={settings.proposalYear}
                                onChange={handleInputChange}
                            />
                        </Col>
                    </Form.Group>
                    <Form.Group as={Row} className="mb-3">
                        <Form.Label column sm={3}>締切日</Form.Label>
                        <Col sm={9}>
                            <Form.Control
                                type="date"
                                name="proposalDeadline"
                                value={settings.proposalDeadline || ''}
                                onChange={handleInputChange}
                            />
                        </Col>
                    </Form.Group>
                </Card.Body>
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
                            <Link href="/admin/analytics" passHref legacyBehavior>
                                <Button as="a" variant="info">集計データを表示</Button>
                            </Link>
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