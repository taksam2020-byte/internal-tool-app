'use client';

import { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Card, Modal, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { useSettings } from '@/context/SettingsContext';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ja } from 'date-fns/locale/ja';
import 'react-datepicker/dist/react-datepicker.css';

// Register the Japanese locale
registerLocale('ja', ja);

interface User { id: number; name: string; role: string; is_active: boolean; is_trainee: boolean; }

const fieldLabels: { [key: string]: string } = {
    applicant: '申請者',
    usageDate: '利用日',
    facility: '対象施設',
    equipment: '設備利用',
    startTime: '開始時間',
    endTime: '終了時間',
    purpose: '利用目的',
};

// Generate time options for dropdown
const timeOptions: string[] = [];
for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 60; j += 30) {
        const hour = i.toString().padStart(2, '0');
        const minute = j.toString().padStart(2, '0');
        timeOptions.push(`${hour}:${minute}`);
    }
}

export default function ReservationsPage() {
  const { settings, isSettingsLoaded } = useSettings();
  const [users, setUsers] = useState<User[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<User[]>([]);
  const [validated, setValidated] = useState(false);
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{success: boolean; message: string} | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [dates, setDates] = useState<(Date | null)[]>([null]);

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
            if (user.is_trainee && !settings.reservationIncludeTrainees) return false;
            return settings.reservationAllowedRoles.includes(user.role);
        }));
    }
  }, [users, settings.reservationAllowedRoles, settings.reservationIncludeTrainees, isSettingsLoaded]);

  const handleDateChange = (date: Date | null, index: number) => {
    const newDates = [...dates];
    newDates[index] = date;
    setDates(newDates);
  };

  const addDateField = () => setDates([...dates, null]);
  const removeDateField = (index: number) => setDates(dates.filter((_, i) => i !== index));

  const handleWifiCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setShowWifiModal(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (form.checkValidity() === false || dates.some(d => d === null)) {
      event.stopPropagation();
      setValidated(true);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.usageDate = dates.map(d => d?.toLocaleDateString('ja-JP')).join(', ');

    const details = Object.entries(data).reduce((acc, [key, value]) => {
        const label = fieldLabels[key] || key;
        acc[label] = value as string;
        return acc;
    }, {} as Record<string, string>);

    try {
      await axios.post('/api/applications', { 
        application_type: 'facility_reservation',
        applicant_name: data.applicant as string,
        title: '施設予約申請',
        details: details,
        emails: settings.reservationEmails
      });
      setSubmitStatus({ success: true, message: `申請が正常に送信されました。` });
      form.reset();
      setValidated(false);
      setDates([null]);
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
      <style jsx global>{`
        .react-datepicker-popper {
          z-index: 1050 !important; 
        }
      `}</style>
      <h1 className="mb-4">本社施設予約</h1>
      <Card className="mb-4">
        <Card.Body>
          <Form noValidate validated={validated} onSubmit={handleSubmit} id="reservation-form">
            <Row className="mb-3">
              <Form.Group as={Col} md="6">
                <Form.Label>申請者</Form.Label>
                {isSettingsLoaded && allowedUsers.length === 0 && users.length > 0 &&
                    <Alert variant="warning">表示できる申請者がいません。管理画面のメニュー管理で、この機能を利用する権限が設定されているか確認してください。</Alert>
                }
                <select required name="applicant" defaultValue="" className="form-select">
                    <option value="" disabled>選択してください...</option>
                    {allowedUsers.map(user => (<option key={user.id} value={user.name}>{user.name}</option>))}
                </select>
              </Form.Group>
              <Form.Group as={Col} md="6">
                <Form.Label>利用日</Form.Label>
                {dates.map((date, index) => (
                    <InputGroup className="mb-2" key={index}>
                        <DatePicker 
                            selected={date} 
                            onChange={(d) => handleDateChange(d, index)} 
                            className="form-control" 
                            required 
                            dateFormat="yyyy/MM/dd"
                            locale="ja"
                            minDate={new Date()}
                            popperClassName="react-datepicker-popper"
                            renderCustomHeader={({
                                date,
                                decreaseMonth,
                                increaseMonth,
                                prevMonthButtonDisabled,
                                nextMonthButtonDisabled,
                            }) => (
                                <div className="d-flex justify-content-center align-items-center">
                                    <Button variant="light" onClick={decreaseMonth} disabled={prevMonthButtonDisabled} size="sm">{'<'}</Button>
                                    <span className="mx-2">{date.getFullYear()}年{date.getMonth() + 1}月</span>
                                    <Button variant="light" onClick={increaseMonth} disabled={nextMonthButtonDisabled} size="sm">{'>'}</Button>
                                </div>
                            )}
                        />
                        {dates.length > 1 && <Button variant="outline-danger" onClick={() => removeDateField(index)}>削除</Button>}
                    </InputGroup>
                ))}
                <Button variant="outline-secondary" size="sm" onClick={addDateField}>+ 日付を追加</Button>
              </Form.Group>
            </Row>

            <Row className="mb-3">
                <Form.Group as={Col} md="6">
                    <Form.Label>対象施設</Form.Label>
                    <Form.Select required name="facility">
                        <option value="">選択してください...</option>
                        <option value="3Fホール(全)">3Fホール(全)</option>
                        <option value="3Fホール(北)">3Fホール(北)</option>
                        <option value="3Fホール(南)">3Fホール(南)</option>
                        <option value="3Fホール(中)">3Fホール(中)</option>
                        <option value="3F食堂">3F食堂</option>
                        <option value="2F応接室">2F応接室</option>
                        <option value="2Fカンファレンスルーム">2Fカンファレンスルーム</option>
                    </Form.Select>
                </Form.Group>
                <Form.Group as={Col} md="6">
                    <Form.Label>設備利用</Form.Label>
                    <div>
                        <Form.Check inline label="シャンプールーム" name="equipment" type="checkbox" value="シャンプールーム" />
                        <Form.Check inline label="Wi-Fi" name="equipment" type="checkbox" value="Wi-Fi" onChange={handleWifiCheck} />
                    </div>
                </Form.Group>
            </Row>

            <Row className="mb-3">
                <Form.Group as={Col} md="6">
                    <Form.Label>開始時間 (準備含む)</Form.Label>
                    <Form.Select name="startTime" required defaultValue="09:00">
                        {timeOptions.map(time => <option key={`start-${time}`} value={time}>{time}</option>)}
                    </Form.Select>
                </Form.Group>
                <Form.Group as={Col} md="6">
                    <Form.Label>終了時間 (片付け含む)</Form.Label>
                    <Form.Select name="endTime" required defaultValue="18:00">
                        {timeOptions.map(time => <option key={`end-${time}`} value={time}>{time}</option>)}
                    </Form.Select>
                </Form.Group>
            </Row>

            <Form.Group>
                <Form.Label>利用目的</Form.Label>
                <Form.Control required as="textarea" name="purpose" rows={4} placeholder="〇〇セミナー" />
            </Form.Group>
          </Form>
        </Card.Body>
      </Card>

      <Alert variant="warning">
        <Alert.Heading as="h5">【注意事項】</Alert.Heading>
        <ul>
            <li>この申請をもって予約完了ではありません。予約の可否については、担当者より別途連絡いたします。</li>
            <li>3Fホール全体を使用する場合や夜間の利用時は、本社朝礼での共有が必要です。</li>
            <li>利用日の前日に、LINE WORKSへの投稿を担当者に依頼してください。</li>
        </ul>
      </Alert>

      <div className="d-grid">
        <Button variant="primary" type="submit" form="reservation-form" size="lg" disabled={isSubmitting}>
           {isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : '申請する'}
        </Button>
      </div>

      <Modal show={showWifiModal} onHide={() => setShowWifiModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Wi-Fi利用について</Modal.Title></Modal.Header>
        <Modal.Body><p>Wi-Fi利用については、本社IT業務部へ別途ご連絡ください。</p></Modal.Body>
        <Modal.Footer><Button variant="primary" onClick={() => setShowWifiModal(false)}>分かりました。</Button></Modal.Footer>
      </Modal>

      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{submitStatus?.success ? '送信完了' : '送信エラー'}</Modal.Title></Modal.Header>
        <Modal.Body>{submitStatus && (<Alert variant={submitStatus.success ? 'success' : 'danger'} className="mb-0">{submitStatus.message}</Alert>)}</Modal.Body>
        <Modal.Footer><Button variant="primary" onClick={() => setShowStatusModal(false)}>閉じる</Button></Modal.Footer>
      </Modal>
    </div>
  );
}