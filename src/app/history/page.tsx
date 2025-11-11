'use client';

import { useState, useEffect } from 'react';
import { Form, Button, Card, Row, Col, Spinner, Table, Modal, Pagination } from 'react-bootstrap';
import { Clipboard, ClipboardCheck } from 'react-bootstrap-icons';
import axios from 'axios';
import { useSettings } from '@/context/SettingsContext';

interface User { id: number; name: string; role: '社長' | '営業' | '内勤'; is_trainee: boolean; is_active: boolean; }

interface Application {
  id: number;
  application_type: string;
  applicant_name: string;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: Record<string, any>; // Allow details to be flexible
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
    const { triggerRefresh } = useSettings();
    const [applications, setApplications] = useState<Application[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [officeStaff, setOfficeStaff] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const applicationsPerPage = 10;

    const displayOrder = [
        // Common
        '申請者', '担当者', '適用開始日',
        // Customer
        'サロン種別', '個人口座', '得意先名（正式）', '得意先名（略称）', '郵便番号', '住所1', '住所2', '電話番号', 'FAX番号', '代表者氏名', '締日', 'メールアドレス', '請求先', '請求先名称', '請求先コード', '別得意先への個人口座請求', '既存の自動引落に追加', '個人口座を含めて引き落とす',
        // Change Customer
        '変更元得意先コード', '変更元得意先名', '新しい得意先名（正式）', '新しい得意先名（略称）',
        // Reservation
        '利用日', '対象施設', '設備利用', '開始時間', '終了時間', '利用目的',
        // Common
        '備考',
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            const appTypes = ['customer_registration', 'customer_change', 'facility_reservation'];
            const [appsRes, usersRes] = await Promise.all([
                axios.get<Application[]>(`/api/applications?type=${appTypes.join(',')}`),
                axios.get<User[]>('/api/users'),
            ]);
            setApplications(appsRes.data);
            console.log('fetchData: Applications fetched:', appsRes.data); // Debug log
            const roleOrder: { [key: string]: number } = { '社長': 1, '営業': 2, '内勤': 3, '営業研修生': 4, '内勤研修生': 5 };
            const sortedUsers = usersRes.data.sort((a, b) => {
                const getSortKey = (user: User) => user.is_trainee ? `${user.role}研修生` : user.role;
                const orderA = roleOrder[getSortKey(a)] || 99;
                const orderB = roleOrder[getSortKey(b)] || 99;
                if (orderA !== orderB) return orderA - orderB;
                return a.id - b.id;
            });
            setUsers(sortedUsers);
        } catch (error) { 
            console.error('fetchData: Error fetching data:', error); // Debug log
            // setError('データの読み込みに失敗しました。'); 
        }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        const internalStaff = users.filter(user => user.role === '内勤' && user.is_active);
        setOfficeStaff(internalStaff);
    }, [users]);

    const handleShowModal = (app: Application) => {
        setSelectedApplication(app);
        setShowModal(true);
    }

    const handleProcessorChange = async (id: number, newProcessorName: string) => {
        console.log(`handleProcessorChange: App ID: ${id}, New Processor: ${newProcessorName}`); // Debug log
        try {
            await axios.put(`/api/applications/${id}`, { processed_by: newProcessorName });
            console.log(`handleProcessorChange: API call successful for App ID: ${id}`); // Debug log
            fetchData(); // Refresh the data
            triggerRefresh(); // Refresh the sidebar
        } catch (error) {
            console.error("Failed to update processor", error);
            alert('処理者の更新に失敗しました。');
        }
    };

    const handleStatusChange = async (id: number, newStatus: string) => {
        const app = applications.find(a => a.id === id);
        if (!app) return;

        const revertUI = () => {
            const selectElement = document.querySelector(`tr[data-row-id="${id}"] .status-select`) as HTMLSelectElement;
            if (selectElement) selectElement.value = app.status;
        };

        // Rule 1: Check processor requirement for final states
        if ((newStatus === '処理済み' || newStatus === 'キャンセル') && !app.processed_by) {
            alert(`ステータスを「${newStatus}」にするには、先に処理者を選択してください。`);
            revertUI();
            return;
        }

        // Rule 2: Confirmation for changing an already processed/cancelled application
        if (app.status !== '未処理' && app.status !== newStatus) {
            if (!window.confirm(`ステータスを「${app.status}」から「${newStatus}」に変更します。よろしいですか？`)) {
                revertUI();
                return;
            }
        }

        // Determine the processor based on the new status
        let finalProcessor = app.processed_by;
        // Rule 3: If status becomes '未処理', processor is cleared
        if (newStatus === '未処理') {
            finalProcessor = null;
        }

        try {
            await axios.put(`/api/applications/${id}`, { 
                status: newStatus, 
                processed_by: finalProcessor
            });
            fetchData();
            triggerRefresh();
        } catch (error) {
            console.error("Failed to update status", error);
            alert('ステータスの更新に失敗しました。');
            revertUI();
        }
    };

    const handleCopyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 1500);
        }, (err) => {
            console.error('Could not copy text: ', err);
        });
    };

    const filteredApplications = applications.filter(app => filterType === 'all' || app.application_type === filterType);
    const indexOfLastApplication = currentPage * applicationsPerPage;
    const indexOfFirstApplication = indexOfLastApplication - applicationsPerPage;
    const currentApplications = filteredApplications.slice(indexOfFirstApplication, indexOfLastApplication);
    const totalPages = Math.ceil(filteredApplications.length / applicationsPerPage);

    const getRowVariant = (status: string) => {
        switch (status) {
            case '未処理': return 'table-warning';
            case 'キャンセル': return 'table-secondary';
            default: return '';
        }
    }

    return (
        <Card className="mb-4">
            <Card.Header as="h5">申請履歴</Card.Header>
            <Card.Body>
                {loading ? <div className="text-center"><Spinner/></div> : (
                    <>
                        <Form.Group as={Row} className="mb-3 align-items-center">
                            <Form.Label sm={2}>申請種別で絞り込み</Form.Label>
                            <Col sm={4}>
                                <Form.Select value={filterType} onChange={e => setFilterType(e.target.value)}>
                                    <option value="all">すべて</option>
                                    {Object.entries(applicationTypeMap).map(([key, value]) => (
                                        <option key={key} value={key}>{value}</option>
                                    ))}
                                </Form.Select>
                            </Col>
                        </Form.Group>

                        <Table striped bordered hover size="sm">
                            <thead>
                                <tr>
                                    <th>申請種別</th>
                                    <th>申請者</th>
                                    <th>申請日</th>
                                    <th>処理者</th>
                                    <th>ステータス</th>
                                    <th>処理日</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentApplications.map(app => (
                                    <tr key={app.id} className={getRowVariant(app.status)} data-row-id={app.id}>
                                        <td>{applicationTypeMap[app.application_type] || app.application_type}</td>
                                        <td>{app.applicant_name}</td>
                                        <td>{new Date(app.submitted_at).toLocaleString()}</td>
                                        <td>
                                            <Form.Select size="sm" value={app.processed_by || ''} onChange={(e) => handleProcessorChange(app.id, e.target.value)}>
                                                <option value="">未選択</option>
                                                {officeStaff.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                            </Form.Select>
                                        </td>
                                        <td>
                                            <Form.Select size="sm" className="status-select" value={app.status} onChange={(e) => handleStatusChange(app.id, e.target.value)}>
                                                <option value="未処理">未処理</option>
                                                <option value="処理済み">処理済み</option>
                                                <option value="キャンセル">キャンセル</option>
                                            </Form.Select>
                                        </td>
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

            <Modal show={showModal} onHide={() => { setShowModal(false); setCopiedKey(null); }} centered size="lg">
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
                                    {Object.entries(selectedApplication.details)
                                        .sort(([keyA], [keyB]) => {
                                            const indexA = displayOrder.indexOf(keyA);
                                            const indexB = displayOrder.indexOf(keyB);
                                            if (indexA === -1) return 1;
                                            if (indexB === -1) return -1;
                                            return indexA - indexB;
                                        })
                                        .map(([key, value]) => (
                                            <tr key={key}>
                                                <td><strong>{key}</strong></td>
                                                <td>
                                                    {String(value)}
                                                    {value && String(value).trim() !== '' && (
                                                        <Button variant="link" size="sm" onClick={() => handleCopyToClipboard(String(value), key)} className="p-0 ms-2 float-end">
                                                            {copiedKey === key ? <ClipboardCheck color="green" size={20} /> : <Clipboard size={20} />}
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => { setShowModal(false); setCopiedKey(null); }}>閉じる</Button>
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

// Force redeploy to clear Vercel cache (3)