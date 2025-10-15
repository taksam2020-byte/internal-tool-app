'use client';

import { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Card, Spinner, InputGroup, Alert, Modal } from 'react-bootstrap';
import { useSettings } from '@/context/SettingsContext';
import axios from 'axios';

interface User { id: number; name: string; role: string; is_active: boolean; is_trainee: boolean; }

const changeableFields = {
    customerName: '得意先名',
    salonType: 'サロン種別',
    address: '住所',
    phone: '電話番号・FAX番号',
    representative: '代表者氏名',
    closingDay: '締日',
    email: 'メールアドレス',
    billing: '請求先',
};
type FieldKey = keyof typeof changeableFields;

const fieldLabels: { [key: string]: string } = {
    effectiveDate: '適用開始日',
    contactPerson: '担当者',
    customerCode_before: '変更元得意先コード',
    customerName_before: '変更元得意先名',
    customerNameFull_after: '新しい得意先名（正式）',
    customerNameShort_after: '新しい得意先名（略称）',
    salonType: 'サロン種別',
    zipCode: '郵便番号',
    address1: '住所1',
    address2: '住所2',
    phone: '電話番号',
    fax: 'FAX番号',
    representativeName: '代表者氏名',
    closingDay: '締日',
    email: 'メールアドレス',
    billingTarget: '請求先',
    billingCustomerName: '請求先名称',
    billingCustomerCode: '請求先コード',
    remarks: '備考',
};

export default function ChangeCustomerPage() {
  const { settings, isSettingsLoaded } = useSettings();
  const [users, setUsers] = useState<User[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<User[]>([]);
  const [validated, setValidated] = useState(false);
  const [zipCode, setZipCode] = useState('');
  const [zipCodeError, setZipCodeError] = useState(false);
  const [address1, setAddress1] = useState('');
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [billingTarget, setBillingTarget] = useState('self');
  const [selectedFields, setSelectedFields] = useState<FieldKey[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{success: boolean; message: string} | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

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

  const handleFieldSelection = (field: FieldKey) => {
    setSelectedFields(prev => 
        prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

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
        application_type: 'customer_change',
        applicant_name: data.contactPerson as string,
        title: '得意先変更申請',
        details: details,
        emails: settings.customerEmails
      });
      setSubmitStatus({ success: true, message: `申請が正常に送信されました。` });
      form.reset();
      setValidated(false);
      setSelectedFields([]);
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
      <h1 className="mb-4">既存情報の変更</h1>
      <Card>
        <Card.Body>
          <Form noValidate validated={validated} onSubmit={handleSubmit}>
            <h5 className="mb-3">必須項目</h5>
            <Row className="mb-3">
                <Form.Group as={Col} md="6">
                    <Form.Label>適用開始日<span className="text-danger">*</span></Form.Label>
                    <Form.Control required type="date" name="effectiveDate" min={new Date().toISOString().split('T')[0]} />
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
            <Row className="mb-4">
                <Col md={6}>
                    <Form.Label>変更元得意先コード<span className="text-danger">*</span></Form.Label>
                    <Form.Control required name="customerCode_before" pattern="^\d{6}$" />
                    <Form.Control.Feedback type="invalid">6桁の得意先コードを入力してください。</Form.Control.Feedback>
                </Col>
                <Col md={6}>
                    <Form.Label>変更元得意先名<span className="text-danger">*</span></Form.Label>
                    <Form.Control required name="customerName_before" placeholder="例: ヘアーサロンタクサム" />
                </Col>
            </Row>

            <h5 className="mb-3">変更する項目を選択</h5>
            <div className="mb-3 p-3 border rounded">
                <Row>{Object.keys(changeableFields).map(key => (<Col md={4} key={key}><Form.Check type="checkbox" id={`check-${key}`} label={changeableFields[key as FieldKey]} checked={selectedFields.includes(key as FieldKey)} onChange={() => handleFieldSelection(key as FieldKey)}/></Col>))}</Row>
            </div>

            {selectedFields.length > 0 && <h5 className="mt-4 mb-3">変更内容</h5>}

            {selectedFields.includes('customerName') && (<Row className="mb-3"><Col md={6}><Form.Label>新しい得意先名（正式）</Form.Label><Form.Control name="customerNameFull_after" placeholder="例: Hair Salon Taksam" /></Col><Col md={6}><Form.Label>新しい得意先名（略称）</Form.Label><Form.Control name="customerNameShort_after" placeholder="例: ヘアーサロンタクサム" /></Col></Row>)}
            {selectedFields.includes('salonType') && (<Form.Group className="mb-3"><Form.Label>{changeableFields.salonType}</Form.Label><div><Form.Check inline label="一般" name="salonType" type="radio" value="一般" /><Form.Check inline label="SPC" name="salonType" type="radio" value="SPC" /></div></Form.Group>)}
            {selectedFields.includes('address') && (<><Row className="mb-3"><Form.Group as={Col} md={4}><Form.Label>郵便番号</Form.Label><InputGroup><Form.Control type="text" name="zipCode" placeholder="1000001" pattern="^\d{7}$" value={zipCode} onChange={(e) => setZipCode(e.target.value)} isInvalid={zipCodeError} /><Button variant="secondary" onClick={handleZipCodeSearch}>{isFetchingAddress ? <Spinner size="sm" animation="border"/> : '住所取得'}</Button><Form.Control.Feedback type="invalid">郵便番号は7桁の数字で入力してください。</Form.Control.Feedback></InputGroup></Form.Group><Form.Group as={Col} md={8}><Form.Label>住所1（都道府県・市区町村）</Form.Label><Form.Control type="text" name="address1" readOnly value={address1} /></Form.Group></Row><Form.Group className="mb-3"><Form.Label>住所2（番地・ビル名等）</Form.Label><Form.Control type="text" name="address2" placeholder="例: 1-1-1 〇〇ビル1F" /></Form.Group></>)}
            {selectedFields.includes('phone') && (<Row className="mb-3"><Form.Group as={Col} md={6}><Form.Label>電話番号</Form.Label><Form.Control type="tel" name="phone" placeholder="03-1234-5678" /></Form.Group><Form.Group as={Col} md={6}><Form.Label>FAX番号</Form.Label><Form.Control type="tel" name="fax" placeholder="03-1234-5679" /></Form.Group></Row>)}
            {selectedFields.includes('representative') && (<Form.Group className="mb-3"><Form.Label>{changeableFields.representative}</Form.Label><Form.Control type="text" name="representativeName" placeholder="山田 太郎" /></Form.Group>)}
            {selectedFields.includes('closingDay') && (<Form.Group className="mb-3"><Form.Label>{changeableFields.closingDay}</Form.Label><div><Form.Check inline label="20日" type="radio" name="closingDay" value="20" /><Form.Check inline label="末日" type="radio" name="closingDay" value="末日" /></div></Form.Group>)}
            {selectedFields.includes('email') && (<Form.Group className="mb-3"><Form.Label>{changeableFields.email}</Form.Label><Form.Control type="email" name="email" placeholder="example@example.com" /></Form.Group>)}
            {selectedFields.includes('billing') && (<Form.Group className="mb-3"><Form.Label>{changeableFields.billing}</Form.Label><div>                    <Form.Check inline label="この得意先へ請求" name="billingTarget" type="radio" value="self" checked={billingTarget === 'self'} onChange={(e) => setBillingTarget(e.target.value)} />
                    <Form.Check inline label="別の得意先へ請求" name="billingTarget" type="radio" value="other" checked={billingTarget === 'other'} onChange={(e) => setBillingTarget(e.target.value)} /></div>{billingTarget === 'other' && (<Row className="mt-2"><Col md={6}><Form.Control name="billingCustomerName" placeholder="請求先名称" /></Col><Col md={6}><Form.Control name="billingCustomerCode" placeholder="請求先コード" /></Col></Row>)}</Form.Group>)}

            <hr />

            <Form.Group className="mb-3"><Form.Label>備考</Form.Label><Form.Control as="textarea" name="remarks" rows={3} /></Form.Group>

            <div className="d-grid mt-4"><Button variant="primary" type="submit" disabled={isSubmitting} size="lg">{isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : '申請する'}</Button></div>
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