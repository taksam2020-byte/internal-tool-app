'use client';

import { useState, useEffect, useRef } from 'react';
import { Form, Button, Row, Col, Card, Spinner, Alert, Modal } from 'react-bootstrap';
import { useSettings } from '@/context/SettingsContext';
import axios from 'axios';

interface User { id: number; name: string; role: string; is_active: boolean; is_trainee: boolean; }

const fieldLabels: { [key: string]: string } = {
    salonType: 'サロン種別',
    personalAccount: '個人口座',
    customerNameFull: '得意先名（正式）',
    customerNameShort: '得意先名（略称）',
    zipCode: '郵便番号',
    address1: '住所1',
    address2: '住所2',
    phone: '電話番号',
    fax: 'FAX番号',
    representativeName: '代表者氏名',
    contactPerson: '担当者',
    closingDay: '締日',
    email: 'メールアドレス',
    billingTarget: '請求先',
    billingCustomerName: '請求先名称',
    billingCustomerCode: '請求先コード',
    includePersonalAccountInBilling: '別得意先への個人口座請求',
    remarks: '備考',
};

export default function NewCustomerPage() {
  const { settings, isSettingsLoaded } = useSettings();
  const [users, setUsers] = useState<User[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<User[]>([]);
  const [validated, setValidated] = useState(false);
  const [zipCode, setZipCode] = useState('');
  const [zipCodeError, setZipCodeError] = useState(false);
  const [address1, setAddress1] = useState('');
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [billingTarget, setBillingTarget] = useState('self');
  const [personalAccount, setPersonalAccount] = useState('不要');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{success: boolean; message: string} | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
        try {
            const res = await axios.get<User[]>('/api/users');
            const roleOrder: { [key: string]: number } = { '社長': 1, '営業': 2, '内勤': 3, '営業研修生': 4, '内勤研修生': 5 };
            const sortedUsers = res.data.sort((a, b) => {
                const getSortKey = (user: User) => user.is_trainee ? `${user.role}研修生` : user.role;
                const orderA = roleOrder[getSortKey(a)] || 99;
                const orderB = roleOrder[getSortKey(b)] || 99;
                if (orderA !== orderB) return orderA - orderB;
                return a.id - b.id;
            });
            setUsers(sortedUsers);
        } catch (err) { console.error("Failed to fetch users", err); }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (isSettingsLoaded) {
        setAllowedUsers(users.filter(user => {
            if (!user.is_active) return false;
            if (user.is_trainee && !settings.customerIncludeTrainees) return false;
            return settings.customerAllowedRoles.includes(user.role);
        }));
    }
  }, [users, settings.customerAllowedRoles, settings.customerIncludeTrainees, isSettingsLoaded]);

  const handleZipCodeSearch = async () => {
    if (!zipCode || !zipCode.match(/^\d{7}$/)) {
        setZipCodeError(true);
        alert('郵便番号は7桁の数字で入力してください。');
        return;
    }
    setZipCodeError(false);
    setIsFetchingAddress(true);
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipCode}`);
      const data = await res.json();
      if (data.results) {
        const { address1, address2, address3 } = data.results[0];
        setAddress1(`${address1}${address2}${address3}`);
      } else {
        alert('該当する住所が見つかりませんでした。');
      }
    } catch (error) {
      console.error("Zip code fetch error:", error);
      alert('住所の取得に失敗しました。');
    } finally {
      setIsFetchingAddress(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (form.checkValidity() === false) {
      event.stopPropagation();
      setValidated(true);
      const firstInvalidField = form.querySelector(':invalid') as HTMLElement;
      if (firstInvalidField) {
        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        alert('必須項目が未入力です。該当箇所にスクロールします。');
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const details = Object.entries(data).reduce((acc, [key, value]) => {
        const label = fieldLabels[key] || key;
        acc[label] = value as string;
        return acc;
    }, {} as Record<string, string>);

    try {
      await axios.post('/api/applications', { 
        application_type: 'customer_registration',
        applicant_name: data.contactPerson as string,
        title: '得意先新規登録申請',
        details: details,
        emails: settings.customerEmails
      });
      setSubmitStatus({ success: true, message: `申請が正常に送信されました。` });
      form.reset();
      setValidated(false);
      setZipCode('');
      setAddress1('');
    } catch (error) {
      console.error("Submit error:", error);
      setSubmitStatus({ success: false, message: '申請の送信に失敗しました。' });
    } finally {
      setIsSubmitting(false);
      setShowStatusModal(true);
    }
  };

  return (
    <div>
      <h1 className="mb-4">得意先 新規登録</h1>
      <Card>
        <Card.Body>
          <Form noValidate validated={validated} onSubmit={handleSubmit} ref={formRef}>
            <Row className="mb-3">
              <Form.Group as={Col} md="6">
                <Form.Label>サロン種別<span className="text-danger">*</span></Form.Label>
                <div>
                  <Form.Check inline label="一般" name="salonType" type="radio" id="generalSalon" value="一般" defaultChecked />
                  <Form.Check inline label="SPC" name="salonType" type="radio" id="spcSalon" value="SPC" />
                </div>
              </Form.Group>
              <Form.Group as={Col} md="6">
                <Form.Label>個人口座<span className="text-danger">*</span></Form.Label>
                <div>
                  <Form.Check inline label="要" name="personalAccount" type="radio" id="personalAccountNeeded" value="要" required checked={personalAccount === '要'} onChange={(e) => setPersonalAccount(e.target.value)} />
                  <Form.Check inline label="不要" name="personalAccount" type="radio" id="personalAccountNotNeeded" value="不要" required checked={personalAccount === '不要'} onChange={(e) => setPersonalAccount(e.target.value)} />
                </div>
              </Form.Group>
            </Row>

            <Row className="mb-3">
                <Col md={6}>
                    <Form.Label>得意先名（正式）<span className="text-danger">*</span></Form.Label>
                    <Form.Control required type="text" name="customerNameFull" placeholder="例: Hair Salon Taksam" />
                </Col>
                <Col md={6}>
                    <Form.Label>得意先名（略称）<span className="text-danger">*</span></Form.Label>
                    <Form.Control required type="text" name="customerNameShort" placeholder="例: ヘアーサロンタクサム" />
                </Col>
            </Row>

            <Row className="mb-3">
                <Form.Group as={Col} md="4">
                    <Form.Label>郵便番号<span className="text-danger">*</span></Form.Label>
                    <div className="d-flex">
                        <Form.Control required type="text" name="zipCode" placeholder="1000001" pattern="^\d{7}$" value={zipCode} onChange={(e) => setZipCode(e.target.value)} isInvalid={zipCodeError} />
                        <Button variant="secondary" onClick={handleZipCodeSearch} className="ms-2 flex-shrink-0">
                            {isFetchingAddress ? <Spinner as="span" animation="border" size="sm" /> : '住所取得'}
                        </Button>
                    </div>
                    <Form.Control.Feedback type="invalid">郵便番号は7桁の数字で入力してください。</Form.Control.Feedback>
                </Form.Group>
                 <Form.Group as={Col} md="8">
                    <Form.Label>住所1<span className="text-danger">*</span></Form.Label>
                    <Form.Control required type="text" name="address1" readOnly value={address1} />
                </Form.Group>
            </Row>
            <Form.Group className="mb-3">
                <Form.Label>住所2<span className="text-danger">*</span></Form.Label>
                <Form.Control required type="text" name="address2" placeholder="例: 1-1-1 〇〇ビル1F" />
            </Form.Group>

            <Row className="mb-3">
                <Form.Group as={Col} md="6">
                    <Form.Label>電話番号<span className="text-danger">*</span></Form.Label>
                    <Form.Control required type="tel" name="phone" placeholder="03-1234-5678" />
                </Form.Group>
                <Form.Group as={Col} md="6">
                    <Form.Label>FAX番号</Form.Label>
                    <Form.Control type="tel" name="fax" placeholder="03-1234-5679" />
                </Form.Group>
            </Row>

            <Row className="mb-3">
                <Form.Group as={Col} md="6">
                    <Form.Label>代表者氏名</Form.Label>
                    <Form.Control type="text" name="representativeName" placeholder="山田 太郎" />
                </Form.Group>
                <Form.Group as={Col} md="6">
                    <Form.Label>担当者<span className="text-danger">*</span></Form.Label>
                    {isSettingsLoaded && allowedUsers.length === 0 && users.length > 0 &&
                        <Alert variant="warning">表示できる担当者がいません。管理画面のメニュー管理で、この機能を利用する権限が設定されているか確認してください。</Alert>
                    }
                    <select required name="contactPerson" defaultValue="" className="form-select">
                        <option value="" disabled>選択してください...</option>
                        {allowedUsers.map(user => (<option key={user.id} value={user.name}>{user.name}</option>))}
                    </select>
                </Form.Group>
            </Row>

            <Row className="mb-3">
                <Form.Group as={Col} md="6">
                    <Form.Label>締日<span className="text-danger">*</span></Form.Label>
                    <div>
                        <Form.Check inline label="20日" type="radio" name="closingDay" value="20" required />
                        <Form.Check inline label="末日" type="radio" name="closingDay" value="末日" required defaultChecked />
                    </div>
                </Form.Group>
                <Form.Group as={Col} md="6">
                    <Form.Label>メールアドレス</Form.Label>
                    <Form.Control type="email" name="email" placeholder="example@example.com" />
                </Form.Group>
            </Row>

            <Form.Group className="mb-3">
                <Form.Label>請求先<span className="text-danger">*</span></Form.Label>
                <div>
                    <Form.Check inline label="この得意先へ請求" name="billingTarget" type="radio" value="self" checked={billingTarget === 'self'} onChange={(e) => setBillingTarget(e.target.value)} />
                    <Form.Check inline label="別の得意先へ請求" name="billingTarget" type="radio" value="other" checked={billingTarget === 'other'} onChange={(e) => setBillingTarget(e.target.value)} />
                </div>
                {billingTarget === 'other' && (
                    <div className="mt-2 p-3 border rounded">
                        <Row>
                            <Col md={6}><Form.Control required name="billingCustomerName" placeholder="請求先名称" /></Col>
                            <Col md={6}><Form.Control name="billingCustomerCode" placeholder="請求先コード" /></Col>
                        </Row>
                        {personalAccount === '要' && (
                            <Form.Group as={Row} className="mt-3 align-items-center">
                                <Form.Label column sm={4}>個人口座を別請求先に含めるか</Form.Label>
                                <Col sm={8}>
                                    <Form.Check inline label="含める" name="includePersonalAccountInBilling" type="radio" value="含める" defaultChecked />
                                    <Form.Check inline label="含めない" name="includePersonalAccountInBilling" type="radio" value="含めない" />
                                </Col>
                            </Form.Group>
                        )}
                    </div>
                )}
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>備考</Form.Label>
                <Form.Control as="textarea" name="remarks" rows={3} />
            </Form.Group>

            <div className="d-grid">
                <Button variant="primary" type="submit" disabled={isSubmitting} size="lg">
                    {isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : '申請する'}
                </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{submitStatus?.success ? '送信完了' : '送信エラー'}</Modal.Title></Modal.Header>
        <Modal.Body>{submitStatus && (<Alert variant={submitStatus.success ? 'success' : 'danger'} className="mb-0">{submitStatus.message}</Alert>)}</Modal.Body>
        <Modal.Footer><Button variant="primary" onClick={() => setShowStatusModal(false)}>閉じる</Button></Modal.Footer>
      </Modal>
    </div>
  );
}