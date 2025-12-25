'use client';

import { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Card, InputGroup, Container, Table } from 'react-bootstrap';
import { PlusCircleFill, TrashFill } from 'react-bootstrap-icons';
import axios from 'axios';
import './ApprovalForm.css';

interface User {
  id: number;
  name: string;
}

interface ProductItem {
  id: number;
  name: string;
  volume: string;
  quantity: string;
}

let nextProductId = 1;

export default function ApprovalFormPage() {
  const [applicant, setApplicant] = useState('');
  const [applicationDate, setApplicationDate] = useState('');
  const [manufacturerName, setManufacturerName] = useState('');
  const [manufacturerContact, setManufacturerContact] = useState('');
  const [salonCode, setSalonCode] = useState('');
  const [salonName, setSalonName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [products, setProducts] = useState<ProductItem[]>([
    { id: 0, name: '', volume: '', quantity: '1' }
  ]);
  const [users, setUsers] = useState<User[]>([]);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    const today = new Date();
    setApplicationDate(today.toLocaleDateString('ja-JP'));
    const fetchUsers = async () => {
      try {
        const res = await axios.get('/api/users');
        const activeUsers = res.data.filter((user: any) => user.is_active && user.role !== '内勤');
        setUsers(activeUsers);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };
    fetchUsers();
  }, []);

  const handleAddProduct = () => {
    setProducts([...products, { id: nextProductId++, name: '', volume: '', quantity: '1' }]);
  };

  const handleRemoveProduct = (id: number) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleProductChange = (id: number, field: keyof Omit<ProductItem, 'id'>, value: string) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handlePrint = () => {
    // Dummy function for now
    alert("Print function will be added later.");
  };

  return (
    <Container>
      <Row>
        <Col>
          <Card className="mb-4">
            <Card.Header as="h3">サンプル申請フォーム</Card.Header>
            <Card.Body>
              <Form noValidate validated={validated} id="approval-form">
                  <Row className="mb-3">
                    <Form.Group as={Col}>
                      <Form.Label>申請者</Form.Label>
                      <Form.Control required type="text" list="user-list" value={applicant} onChange={e => setApplicant(e.target.value)} placeholder="氏名を入力または選択"/>
                      <datalist id="user-list">
                          {users.map(user => <option key={user.id} value={user.name} />)}
                      </datalist>
                      <Form.Control.Feedback type="invalid">申請者を入力してください。</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group as={Col}>
                      <Form.Label>申請日</Form.Label>
                      <Form.Control type="text" value={applicationDate} readOnly disabled />
                    </Form.Group>
                  </Row>
                  <Row className="mb-3">
                        <Form.Group as={Col}>
                            <Form.Label>メーカー名</Form.Label>
                            <Form.Control required value={manufacturerName} onChange={e => setManufacturerName(e.target.value)} onChange={e => setManufacturerName(e.target.value)} />
                            <Form.Control.Feedback type="invalid">メーカー名を入力してください。</Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group as={Col}>
                            <Form.Label>メーカー担当者名</Form.Label>
                            <Form.Control value={manufacturerContact} onChange={e => setManufacturerContact(e.target.value)} />
                        </Form.Group>
                    </Row>
                    <Row className="mb-3">
                        <Form.Group as={Col}>
                            <Form.Label>サロンコード</Form.Label>
                            <Form.Control required value={salonCode} onChange={e => setSalonCode(e.target.value)} />
                            <Form.Control.Feedback type="invalid">サロンコードを入力してください。</Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group as={Col}>
                            <Form.Label>サロン名</Form.Label>
                            <Form.Control required value={salonName} onChange={e => setSalonName(e.target.value)} />
                            <Form.Control.Feedback type="invalid">サロン名を入力してください。</Form.Control.Feedback>
                        </Form.Group>
                    </Row>
                    <Form.Group className="mb-3">
                        <Form.Label>申請目的</Form.Label>
                        <Form.Select required value={purpose} onChange={e => setPurpose(e.target.value)}>
                            <option value="">選択してください...</option>
                            <option value="キャンペーン">キャンペーン</option>
                            <option value="新規">新規</option>
                            <option value="臨店">臨店</option>
                            <option value="破損交換">破損交換</option>
                            <option value="その他">その他</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">申請目的を選択してください。</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>申請理由・条件</Form.Label>
                        <Form.Control required as="textarea" rows={3} value={reason} onChange={e => setReason(e.target.value)} />
                        <Form.Control.Feedback type="invalid">申請理由・条件を入力してください。</Form.Control.Feedback>
                    </Form.Group>
                    <hr />
                    <h6>申請商品</h6>
                    {products.map((p, index) => (
                        <Card key={p.id} className="mb-3">
                            <Card.Header className="d-flex justify-content-between align-items-center py-2">
                                <strong>商品 {index + 1}</strong>
                                <Button variant="link" onClick={() => handleRemoveProduct(p.id)} className="text-danger p-0" disabled={products.length <= 1}>
                                    <TrashFill size={20} />
                                </Button>
                            </Card.Header>
                            <Card.Body>
                                <Form.Group className="mb-2">
                                    <Form.Label className="small">商品名</Form.Label>
                                    <Form.Control required placeholder="商品名" value={p.name} onChange={e => handleProductChange(p.id, 'name', e.target.value)} />
                                    <Form.Control.Feedback type="invalid">商品名を入力してください。</Form.Control.Feedback>
                                </Form.Group>
                                <Row>
                                    <Form.Group as={Col}>
                                        <Form.Label className="small">容量</Form.Label>
                                        <Form.Control placeholder="容量" value={p.volume} onChange={e => handleProductChange(p.id, 'volume', e.target.value)} />
                                    </Form.Group>
                                    <Form.Group as={Col}>
                                        <Form.Label className="small">数量</Form.Label>
                                        <Form.Control required type="number" placeholder="数量" value={p.quantity} onChange={e => handleProductChange(p.id, 'quantity', e.target.value)} />
                                        <Form.Control.Feedback type="invalid">数量を入力してください。</Form.Control.Feedback>
                                    </Form.Group>
                                </Row>
                            </Card.Body>
                        </Card>
                    ))}
                    <div className="d-grid">
                        <Button variant="outline-secondary" onClick={handleAddProduct}><PlusCircleFill /> 商品を追加</Button>
                    </div>
                </Form>
              </Card.Body>
            </Card>
            <div className="d-grid my-4">
                <Button onClick={handlePrint} size="lg">印刷またはPDFとして保存</Button>
            </div>
        </Col>
      </Row>
    </Container>
  );
}