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
                    </Form.Group>
                    <Form.Group as={Col}>
                      <Form.Label>申請日</Form.Label>
                      <Form.Control type="text" value={applicationDate} readOnly disabled />
                    </Form.Group>
                  </Row>
                  {/* Other form fields would go here */}
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