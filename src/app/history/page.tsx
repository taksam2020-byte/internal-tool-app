'use client';

import { useState, useEffect } from 'react';
import { Form, Button, Card, Row, Col, Spinner, Table, Modal, Pagination } from 'react-bootstrap';
import axios from 'axios';

interface User { id: number; name: string; role: '社長' | '営業' | '内勤'; is_trainee: boolean; is_active: boolean; }

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

const applicationTypeMap: { [key: string]: string } = {
  customer_registration: '得意先新規登録',
  customer_change: '得意先情報変更',
  facility_reservation: '施設予約',
};

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
            const roleOrder: { [key: string]: number } = { '社長': 1, '営業': 2, '内勤': 3, '営業研修生': 4, '内勤研修生': 5 };
            const sortedUsers = usersRes.data.sort((a, b) => {
                const getSortKey = (user: User) => user.is_trainee ? `${user.role}研修生` : user.role;
                const orderA = roleOrder[getSortKey(a)] || 99;
                const orderB = roleOrder[getSortKey(b)] || 99;
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
            <Card.Header as="h5">申請履歴</Card.Header>
            <Card.Body>
                {loading ? <div className="text-center"><Spinner/></div> : (
                    <>
                        <Form.Group as={Row} className="mb-3 align-items-center">
                            <Form.Label column sm={2}>申請種別で絞り込み</Form.Label>
                            <Col sm={4}>
                                <Form.Select value={filterType} onChange={e => setFilterType(e.target.value)}>
                                    <option value="all">すべて</option>
                                    {Object.entries(applicationTypeMap).map(([key, value]) => (
                                        <option key={key} value={key}>{value}</option>
                                    ))}
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
                                        <td>{applicationTypeMap[app.application_type] || app.application_type}</td>
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

export default function HistoryPage() {
    return (
        <div>
            <h1 className="mb-4">申請履歴</h1>
            <ApplicationsManagement />
        </div>
    );
}
