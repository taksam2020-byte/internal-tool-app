'use client';

import { useState, useEffect, useRef } from 'react';
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
  // --- Form State ---
  const [applicant, setApplicant] = useState('');
  const [applicationDate, setApplicationDate] = useState('');
  const [manufacturerName, setManufacturerName] = useState('');
  const [manufacturerContact, setManufacturerContact] = useState('');
  const [salonCode, setSalonCode] = useState('');
  const [salonName, setSalonName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [products, setProducts] = useState<ProductItem[]>([
    { id: 0, name: '', volume: '', quantity: '' }
  ]);

  // --- UI State & Data ---
  const [users, setUsers] = useState<User[]>([]);
  const [validated, setValidated] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set application date to today
    const today = new Date();
    setApplicationDate(today.toLocaleDateString('ja-JP'));

    // Fetch users for datalist
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
    setProducts([...products, { id: nextProductId++, name: '', volume: '', quantity: '' }]);
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
    // Basic form validation before printing
    const form = document.getElementById('approval-form') as HTMLFormElement;
    if (form.checkValidity() === false) {
        setValidated(true);
        alert('必須項目をすべて入力してください。');
        return;
    }
    window.print();
  };


    return (


      <>


        <div>


        <Row>
          <Col>
            <Card className="mb-4 form-section">
              <Card.Header as="h3">サンプル申請フォーム</Card.Header>
              <Card.Body>
                <Form noValidate validated={validated} id="approval-form">


                    {/* Form fields... */}


                    <Row className="mb-3">


                      <Form.Group as={Col}>


                        <Form.Label>申請者</Form.Label>


                        <Form.Control


                          required


                          type="text"


                          list="user-list"


                          value={applicant}


                          onChange={e => setApplicant(e.target.value)}


                          placeholder="氏名を入力または選択"


                        />


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


                        <Form.Control required value={manufacturerName} onChange={e => setManufacturerName(e.target.value)} />


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


                    


                    <hr/>


  


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


                      <Button variant="outline-secondary" onClick={handleAddProduct}><PlusCircleFill/> 商品を追加</Button>


                    </div>


                  </Form>


                </Card.Body>


              </Card>


  


              <div className="d-grid my-4">


                  <Button onClick={handlePrint} size="lg">印刷またはPDFとして保存</Button>


              </div>


            </Col>


          </Row>


          <Row>


            <Col>


              <div className="print-preview-section">


                  <div className="print-area" ref={printAreaRef}>


                      <div className="print-area-content">


                          <h1 className="text-center">サンプル申請書</h1>


                          


                          <div className="header-info">


                              <span>申請日: {applicationDate}</span>


                              <span>申請者: {applicant}</span>


                          </div>


  


                          <Table bordered className="mt-3">


                              <tbody>


                              <tr>


                                  <th className="bg-light">メーカー名</th>


                                  <td>{manufacturerName}</td>


                                  <th className="bg-light">メーカー担当者名</th>


                                  <td>{manufacturerContact ? `${manufacturerContact} 様` : ''}</td>


                              </tr>


                              <tr>


                                  <th className="bg-light">サロンコード</th>


                                  <td>{salonCode}</td>


                                  <th className="bg-light">サロン名</th>


                                  <td>{salonName ? `${salonName} 様` : ''}</td>


                              </tr>


                              <tr>


                                  <th className="bg-light">申請目的</th>


                                  <td colSpan={3}>{purpose}</td>


                              </tr>


                              <tr>


                                  <th className="bg-light">申請理由・条件</th>


                                  <td colSpan={3} style={{whiteSpace: 'pre-wrap'}}>{reason}</td>


                              </tr>


                              </tbody>


                          </Table>


  


                          <h5 className="mt-4">申請商品リスト</h5>


                          <Table bordered striped>


                              <thead>


                              <tr>


                                  <th>商品名</th>


                                  <th>容量</th>


                                  <th>数量</th>


                              </tr>


                              </thead>


                              <tbody>


                              {products.map(p => (


                                  <tr key={p.id}>


                                  <td>{p.name}</td>


                                  <td>{p.volume}</td>


                                  <td>{p.quantity}</td>


                                  </tr>


                              ))}


                              {Array.from({ length: Math.max(0, 8 - products.length) }).map((_, i) => (


                                  <tr key={`empty-${i}`}><td style={{height: '34px'}}>&nbsp;</td><td></td><td></td></tr>


                              ))}


                              </tbody>


                          </Table>


  


                          <div className="footer-section">


                                              <div className="order-info">


                                                  <Form.Group as={Row} className="align-items-center">


                                                      <Form.Label column xs="auto" className="fw-bold">受注番号:</Form.Label>


                                                      <Col>


                                                          <Form.Control type="text" className="order-number-input print-hide"/>


                                                      </Col>


                                                  </Form.Group>


                                              </div>


                              <div className="approval-stamps">


                              <div className="stamp-box">受注者</div>


                              <div className="stamp-box">承認</div>


                              </div>


                          </div>


                      </div>


                  </div>


              </div>


            </Col>


          </Row>


        </div>


        


        {/* This div is only for printing and is not displayed on screen */}


        <div className="print-only">


          {/* The content of the print-area div will be cloned here by the print logic if needed */}


        </div>


      </>


    );


  }
