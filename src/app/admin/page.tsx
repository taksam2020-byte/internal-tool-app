// Force re-build
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Button, Card, Row, Col, Alert, InputGroup, Spinner, Table, Tabs, Tab, Modal, Pagination, Badge } from 'react-bootstrap';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

// --- Type Definitions ---
interface User { id: number; name: string; role: '社長' | '営業' | '内勤'; is_trainee: boolean; is_active: boolean; }

// --- User Management Component ---
function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [newUser, setNewUser] = useState({ id: '', name: '', role: '内勤' as User['role'], is_trainee: false });
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 20;

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get<User[]>('/api/users');
            const roleOrder: { [key: string]: number } = { '社長': 1, '営業': 2, '内勤': 3 };
            const sortedUsers = res.data.sort((a, b) => {
                const roleA = a.role || '内勤';
                const roleB = b.role || '内勤';
                const orderA = roleOrder[roleA] || 4;
                const orderB = roleOrder[roleB] || 4;
                if (orderA !== orderB) return orderA - orderB;
                return a.id - b.id;
            });
            setUsers(sortedUsers);
        } catch { setError('ユーザーの読み込みに失敗しました。'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleInputChange = (e: React.ChangeEvent<any>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        if (editingUser) {
            setEditingUser({ ...editingUser, [name]: type === 'checkbox' ? checked : value });
        } else {
            setNewUser(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.id || !newUser.name.trim()) { setError('IDとユーザー名を入力してください。'); return; }
        try {
            setError('');
            await axios.post('/api/users', { ...newUser, id: parseInt(newUser.id) });
            setNewUser({ id: '', name: '', role: '内勤', is_trainee: false });
            await fetchUsers();
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) { setError(err.response.data.message || 'ユーザーの追加に失敗しました。'); } 
            else { setError('予期せぬエラーが発生しました。'); }
        }
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        try {
            await axios.put(`/api/users/${editingUser.id}`, { 
                name: editingUser.name, 
                role: editingUser.role, 
                is_trainee: editingUser.is_trainee 
            });
            setEditingUser(null);
            await fetchUsers();
        } catch { alert('更新に失敗しました。'); }
    };

    const handleToggleActive = async (user: User) => {
        try {
            await axios.put(`/api/users/${user.id}`, { is_active: !user.is_active });
            await fetchUsers();
        } catch { alert('状態の更新に失敗しました。'); }
    };

    const handleDeleteUser = async (userId: number) => {
        if (window.confirm('本当にこのユーザーを削除しますか？関連する過去のデータも失われる可能性があります。')) {
            try {
                await axios.delete(`/api/users/${userId}`);
                await fetchUsers();
            } catch { alert('削除に失敗しました。'); }
        }
    };

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(users.length / usersPerPage);

    const userColumns: [User[], User[]] = [[], []];
    currentUsers.forEach((user, index) => {
        userColumns[index % 2].push(user);
    });

    return (
        <Card className="mb-4">
            <Card.Header as="h5">ユーザー管理</Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {loading ? <div className="text-center"><Spinner /></div> : (
                    <>
                        <Row>
                            {userColumns.map((col, colIndex) => (
                                <Col md={6} key={colIndex}>
                                    <Table striped bordered hover size="sm" className="mb-3 align-middle">
                                        <thead><tr><th>ID</th><th>氏名</th><th>属性</th><th className="text-center">表示</th><th className="text-center">操作</th></tr></thead>
                                        <tbody>
                                            {col.map(user => (
                                                <tr key={user.id}>
                                                    <td>{user.id}</td>
                                                    <td>{user.name}</td>
                                                    <td><Badge bg={user.role === '社長' ? 'danger' : user.role === '営業' ? 'primary' : 'secondary'}>{user.role}</Badge>{user.is_trainee && <Badge bg="info" className="ms-1">研修生</Badge>}</td>
                                                    <td className="text-center"><Form.Check type="switch" checked={user.is_active} onChange={() => handleToggleActive(user)} /></td>
                                                    <td className="text-center">
                                                        <Button variant="outline-primary" size="sm" onClick={() => setEditingUser(user)}>編集</Button>
                                                        <Button variant="outline-danger" size="sm" className="ms-2" onClick={() => handleDeleteUser(user.id)}>削除</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </Col>
                            ))}
                        </Row>
                        {totalPages > 1 && <Pagination>{Array.from({ length: totalPages }, (_, i) => <Pagination.Item key={i + 1} active={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>{i + 1}</Pagination.Item>)}</Pagination>}
                    </>
                )}
                <h6>新規ユーザー追加</h6>
                <Form onSubmit={handleAddUser}>
                    <Row className="g-2">
                        <Col md={2}><Form.Control type="number" name="id" value={newUser.id} onChange={handleInputChange} placeholder="ID" required /></Col>
                        <Col md={4}><Form.Control type="text" name="name" value={newUser.name} onChange={handleInputChange} placeholder="氏名" required /></Col>
                        <Col md={3}><Form.Select name="role" value={newUser.role} onChange={handleInputChange}><option value="社長">社長</option><option value="営業">営業</option><option value="内勤">内勤</option></Form.Select></Col>
                        <Col md={2} className="d-flex align-items-center"><Form.Check type="checkbox" name="is_trainee" label="研修生" checked={newUser.is_trainee} onChange={handleInputChange} /></Col>
                        <Col md={1}><Button type="submit" variant="outline-primary" className="w-100">追加</Button></Col>
                    </Row>
                </Form>
            </Card.Body>

            <Modal show={!!editingUser} onHide={() => setEditingUser(null)} centered>
                <Modal.Header closeButton><Modal.Title>ユーザー情報編集</Modal.Title></Modal.Header>
                <Modal.Body>
                    {editingUser && <Form>
                        <Form.Group className="mb-3"><Form.Label>ID</Form.Label><Form.Control type="number" value={editingUser.id} readOnly /></Form.Group>
                        <Form.Group className="mb-3"><Form.Label>氏名</Form.Label><Form.Control type="text" name="name" value={editingUser.name} onChange={handleInputChange} /></Form.Group>
                        <Form.Group className="mb-3"><Form.Label>属性</Form.Label><Form.Select name="role" value={editingUser.role} onChange={handleInputChange}><option value="社長">社長</option><option value="営業">営業</option><option value="内勤">内勤</option></Form.Select></Form.Group>
                        <Form.Group className="mb-3"><Form.Check type="checkbox" name="is_trainee" label="研修生" checked={editingUser.is_trainee} onChange={handleInputChange} /></Form.Group>
                    </Form>}
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setEditingUser(null)}>キャンセル</Button><Button variant="primary" onClick={handleSaveUser}>保存</Button></Modal.Footer>
            </Modal>
        </Card>
    );
}

function MenuManagement() {
    const { settings, setSettings } = useSettings();
    const userRoles = ['社長', '営業', '内勤'];

    const handleAllowedRolesChange = (menu: string, role: string) => {
        const key = `${menu}AllowedRoles` as keyof typeof settings;
        const currentRoles = settings[key] as string[] || [];
        const newRoles = currentRoles.includes(role) ? currentRoles.filter(r => r !== role) : [...currentRoles, role];
        setSettings(prev => ({ ...prev, [key]: newRoles }));
    };

    return (
        <Card className="mb-4">
            <Card.Header as="h5">メニュー管理</Card.Header>
            <Tabs id="menu-management-tabs" className="mb-3" variant="pills" justify>
                <Tab eventKey="customers" title="得意先登録">
                    <Card.Body>
                        <StringListEditor title="通知先メールアドレス" list={settings.customerEmails} onUpdate={(list) => setSettings(p => ({...p, customerEmails: list}))} />
                        <RoleSelector title="申請可能ユーザー" roles={userRoles} selectedRoles={settings.customerAllowedRoles} onChange={(role) => handleAllowedRolesChange('customer', role)} />
                        <Form.Group as={Row} className="mb-3"><Form.Label column sm={3}>研修生を含める</Form.Label><Col sm={9}><Form.Check type="switch" checked={settings.customerIncludeTrainees} onChange={(e) => setSettings(p => ({...p, customerIncludeTrainees: e.target.checked}))} /></Col></Form.Group>
                    </Card.Body>
                </Tab>
                <Tab eventKey="reservations" title="施設予約">
                    <Card.Body>
                        <StringListEditor title="通知先メールアドレス" list={settings.reservationEmails} onUpdate={(list) => setSettings(p => ({...p, reservationEmails: list}))} />
                        <RoleSelector title="申請可能ユーザー" roles={userRoles} selectedRoles={settings.reservationAllowedRoles} onChange={(role) => handleAllowedRolesChange('reservation', role)} />
                        <Form.Group as={Row} className="mb-3"><Form.Label column sm={3}>研修生を含める</Form.Label><Col sm={9}><Form.Check type="switch" checked={settings.reservationIncludeTrainees} onChange={(e) => setSettings(p => ({...p, reservationIncludeTrainees: e.target.checked}))} /></Col></Form.Group>
                    </Card.Body>
                </Tab>
                <Tab eventKey="evaluations" title="新人考課">
                    <Card.Body>
                        <RoleSelector title="提出可能ユーザー" roles={userRoles} selectedRoles={settings.evaluationAllowedRoles} onChange={(role) => handleAllowedRolesChange('evaluation', role)} />
                        <Form.Group as={Row} className="mb-3"><Form.Label column sm={3}>研修生を含める</Form.Label><Col sm={9}><Form.Check type="switch" checked={settings.evaluationIncludeTrainees} onChange={(e) => setSettings(p => ({...p, evaluationIncludeTrainees: e.target.checked}))} /></Col></Form.Group>
                        <Form.Group as={Row} className="mb-3"><Form.Label column sm={3}>受付状況</Form.Label><Col sm={9}><Form.Check type="switch" name="isEvaluationOpen" label={settings.isEvaluationOpen ? "受付中" : "停止中"} checked={settings.isEvaluationOpen} onChange={(e) => setSettings(p=>({...p, isEvaluationOpen: e.target.checked}))}/></Col></Form.Group>
                        <Form.Group as={Row} className="mb-3"><Form.Label column sm={3}>対象月度</Form.Label><Col sm={9}><Form.Select name="evaluationMonth" value={settings.evaluationMonth} onChange={(e) => setSettings(p=>({...p, evaluationMonth: e.target.value}))}>{Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{i+1}月</option>)}</Form.Select></Col></Form.Group>
                        <Form.Group as={Row} className="mb-3"><Form.Label column sm={3}>締切日</Form.Label><Col sm={9}><Form.Control type="date" name="evaluationDeadline" value={settings.evaluationDeadline || ''} onChange={(e) => setSettings(p=>({...p, evaluationDeadline: e.target.value}))}/></Col></Form.Group>
                    </Card.Body>
                </Tab>
                <Tab eventKey="proposals" title="催事提案">
                    <Card.Body>
                        <StringListEditor title="通知先メールアドレス" list={settings.proposalEmails} onUpdate={(list) => setSettings(p => ({...p, proposalEmails: list}))} />
                        <RoleSelector title="提出可能ユーザー" roles={userRoles} selectedRoles={settings.proposalAllowedRoles} onChange={(role) => handleAllowedRolesChange('proposal', role)} />
                        <Form.Group as={Row} className="mb-3"><Form.Label column sm={3}>研修生を含める</Form.Label><Col sm={9}><Form.Check type="switch" checked={settings.proposalIncludeTrainees} onChange={(e) => setSettings(p => ({...p, proposalIncludeTrainees: e.target.checked}))} /></Col></Form.Group>
                        <Form.Group as={Row} className="mb-3"><Form.Label column sm={3}>受付状況</Form.Label><Col sm={9}><Form.Check type="switch" name="isProposalOpen" label={settings.isProposalOpen ? "受付中" : "停止中"} checked={settings.isProposalOpen} onChange={(e) => setSettings(p=>({...p, isProposalOpen: e.target.checked}))}/></Col></Form.Group>
                        <Form.Group as={Row} className="mb-3"><Form.Label column sm={3}>提案年度</Form.Label><Col sm={9}><Form.Control type="number" name="proposalYear" value={settings.proposalYear} onChange={(e) => setSettings(p=>({...p, proposalYear: e.target.value}))}/></Col></Form.Group>
                        <Form.Group as={Row} className="mb-3"><Form.Label column sm={3}>締切日</Form.Label><Col sm={9}><Form.Control type="date" name="proposalDeadline" value={settings.proposalDeadline || ''} onChange={(e) => setSettings(p=>({...p, proposalDeadline: e.target.value}))}/></Col></Form.Group>
                    </Card.Body>
                </Tab>
            </Tabs>
        </Card>
    );
}

function StringListEditor({ title, list, onUpdate, placeholder }: { title: string, list: string[], onUpdate: (list: string[]) => void, placeholder?: string }) {
    const handleItemChange = (index: number, value: string) => onUpdate(list.map((item, i) => i === index ? value : item));
    const addItemField = () => onUpdate([...list, '']);
    const removeItemField = (index: number) => onUpdate(list.filter((_, i) => i !== index));
    return (
        <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={3}>{title}</Form.Label>
            <Col sm={9}>
                {list.map((item, index) => (
                    <InputGroup key={index} className="mb-2">
                        <Form.Control type="text" value={item} onChange={(e) => handleItemChange(index, e.target.value)} placeholder={placeholder || "name@example.com"}/>
                        <Button variant="outline-danger" onClick={() => removeItemField(index)}>削除</Button>
                    </InputGroup>
                ))}
                <Button variant="outline-secondary" size="sm" onClick={addItemField}>+ 追加</Button>
            </Col>
        </Form.Group>
    );
}

function RoleSelector({ title, roles, selectedRoles, onChange }: { title: string, roles: string[], selectedRoles: string[], onChange: (role: string) => void }) {
    return (
        <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={3}>{title}</Form.Label>
            <Col sm={9}>
                {roles.map(role => (
                    <Form.Check inline key={role} type="checkbox" label={role} checked={selectedRoles.includes(role)} onChange={() => onChange(role)} />
                ))}
            </Col>
        </Form.Group>
    );
}

interface Application {
  id: number;
  application_type: string;
  applicant_name: string;
  title: string;
  details: Record<string, string>;
  submitted_at: string;
  status: string;
  processed_by: string | null;
  processed_at: string | null;
}

function ApplicationsManagement() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [processorName, setProcessorName] = useState('');
    const applicationsPerPage = 10;

    const fetchData = async () => {
        setLoading(true);
        try {
            const [appsRes, usersRes] = await Promise.all([
                axios.get<Application[]>('/api/applications'),
                axios.get<User[]>('/api/users'),
            ]);
            setApplications(appsRes.data);
            const roleOrder: { [key: string]: number } = { '社長': 1, '営業': 2, '内勤': 3 };
            const sortedUsers = usersRes.data.sort((a, b) => {
                const roleA = a.role || '内勤';
                const roleB = b.role || '内勤';
                const orderA = roleOrder[roleA] || 4;
                const orderB = roleOrder[roleB] || 4;
                if (orderA !== orderB) return orderA - orderB;
                return a.id - b.id;
            });
            setUsers(sortedUsers);
        } catch { 
            // setError('データの読み込みに失敗しました。'); 
        }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleShowModal = (app: Application) => {
        setSelectedApplication(app);
        setShowModal(true);
    }

    const handleStatusChange = async (id: number, newStatus: string) => {
        if (!processorName) {
            alert('ステータスを変更する前に、上部で処理者を選択してください。');
            return;
        }
        try {
            await axios.put(`/api/applications/${id}`,
                { status: newStatus, processed_by: processorName });
            fetchData(); // Refresh the data
        } catch (error) {
            console.error("Failed to update status", error);
            alert('ステータスの更新に失敗しました。');
        }
    };

    const filteredApplications = applications.filter(app => filterType === 'all' || app.application_type === filterType);
    const indexOfLastApplication = currentPage * applicationsPerPage;
    const indexOfFirstApplication = indexOfLastApplication - applicationsPerPage;
    const currentApplications = filteredApplications.slice(indexOfFirstApplication, indexOfLastApplication);
    const totalPages = Math.ceil(filteredApplications.length / applicationsPerPage);

    return (
        <Card className="mb-4">
            <Card.Header as="h5">申請管理</Card.Header>
            <Card.Body>
                {loading ? <div className="text-center"><Spinner/></div> : (
                    <>
                        <Form.Group as={Row} className="mb-3 align-items-center">
                            <Form.Label column sm={2}>申請種別で絞り込み</Form.Label>
                            <Col sm={4}>
                                <Form.Select value={filterType} onChange={e => setFilterType(e.target.value)}>
                                    <option value="all">すべて</option>
                                    <option value="customer_registration">得意先新規登録</option>
                                    <option value="customer_change">得意先情報変更</option>
                                    <option value="facility_reservation">施設予約</option>
                                </Form.Select>
                            </Col>
                            <Form.Label column sm={1}>処理者:</Form.Label>
                            <Col sm={5}>
                                <Form.Select value={processorName} onChange={e => setProcessorName(e.target.value)}>
                                    <option value="">選択してください...</option>
                                    {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                </Form.Select>
                            </Col>
                        </Form.Group>

                        <Table striped bordered hover size="sm">
                            <thead>
                                <tr>
                                    <th>申請種別</th>
                                    <th>件名</th>
                                    <th>申請者</th>
                                    <th>申請日</th>
                                    <th>ステータス</th>
                                    <th>処理者</th>
                                    <th>処理日</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentApplications.map(app => (
                                    <tr key={app.id}>
                                        <td>{app.application_type}</td>
                                        <td>{app.title}</td>
                                        <td>{app.applicant_name}</td>
                                        <td>{new Date(app.submitted_at).toLocaleString()}</td>
                                        <td>
                                            <Form.Select size="sm" value={app.status} onChange={(e) => handleStatusChange(app.id, e.target.value)}>
                                                <option value="未処理">未処理</option>
                                                <option value="処理中">処理中</option>
                                                <option value="処理済み">処理済み</option>
                                                <option value="差戻し">差戻し</option>
                                            </Form.Select>
                                        </td>
                                        <td>{app.processed_by}</td>
                                        <td>{app.processed_at ? new Date(app.processed_at).toLocaleString() : ''}</td>
                                        <td>
                                            <Button variant="outline-primary" size="sm" onClick={() => handleShowModal(app)}>詳細</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>

                        {totalPages > 1 && <Pagination>{Array.from({ length: totalPages }, (_, i) => <Pagination.Item key={i + 1} active={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>{i + 1}</Pagination.Item>)}</Pagination>}
                    </>
                )}
            </Card.Body>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>申請詳細</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedApplication && (
                        <>
                            <h5>{selectedApplication.title}</h5>
                            <p><strong>申請者:</strong> {selectedApplication.applicant_name}</p>
                            <p><strong>申請日:</strong> {new Date(selectedApplication.submitted_at).toLocaleString()}</p>
                            <hr />
                            <Table striped bordered size="sm">
                                <tbody>
                                    {Object.entries(selectedApplication.details).map(([key, value]) => (
                                        <tr key={key}>
                                            <td><strong>{key}</strong></td>
                                            <td>{value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>閉じる</Button>
                </Modal.Footer>
            </Modal>
        </Card>
    );
}

export default function AdminPage() {
    const { isAuthenticated } = useAuth();
    const { settings } = useSettings(); // Get settings to save
    const router = useRouter();
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleSave = async () => {
        try {
            await axios.post('/api/settings', settings);
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Failed to save settings", error);
            alert('設定の保存に失敗しました。');
        }
    };

    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated, router]);

    if (!isAuthenticated) return <div>読み込み中...</div>;

    return (
        <div>
            <h1 className="mb-4">管理画面</h1>
            <UserManagement />
            <MenuManagement />
            <ApplicationsManagement />

            <div className="mt-4 d-grid">
                <Button variant="primary" size="lg" onClick={handleSave}>すべての設定を保存</Button>
            </div>

            <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
                <Modal.Header closeButton><Modal.Title>保存完了</Modal.Title></Modal.Header>
                <Modal.Body><Alert variant="success" className="mb-0">設定は自動的に保存されました。</Alert></Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowSuccessModal(false)}>閉じる</Button></Modal.Footer>
            </Modal>
        </div>
    );
}