'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Nav, Navbar, Offcanvas, Accordion, useAccordionButton, Card, Badge } from 'react-bootstrap';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useSettings } from '@/context/SettingsContext';
import axios from 'axios';

function CustomAccordionToggle({ children, eventKey, callback }: { children: React.ReactNode, eventKey: string, callback?: () => void }) {
  const decoratedOnClick = useAccordionButton(eventKey, callback);
  return (
    <div onClick={decoratedOnClick} style={{ cursor: 'pointer' }}>
      {children}
    </div>
  );
}

function SidebarNav({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, isSettingsLoaded, refreshKey, isDirty, setIsDirty } = useSettings();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const appTypes = ['customer_registration', 'customer_change', 'facility_reservation'];
        const res = await axios.get(`/api/applications?status=未処理&type=${appTypes.join(',')}`);
        setPendingCount(res.data.length);
      } catch (error) {
        console.error("Failed to fetch pending applications count", error);
      }
    };

    fetchPendingCount();
  }, [refreshKey]);

  const isCustomerRoute = pathname.startsWith('/customers');

  const handleLinkClick = (e: React.MouseEvent<HTMLElement>, href: string) => {
    if (isDirty) {
      if (!window.confirm('編集中の内容があります。ページを離れてもよろしいですか？')) {
        e.preventDefault();
        return;
      }
      setIsDirty(false); // ページ遷移を許可
    }
    router.push(href);
    if (onLinkClick) onLinkClick();
  };

  if (!isSettingsLoaded) {
    return <div>読み込み中...</div>;
  }

  return (
    <Accordion as={Nav} activeKey={isCustomerRoute ? "0" : undefined} className="flex-column">
      <Nav.Item className="mb-2">
        <Link href="/" passHref legacyBehavior><Nav.Link className="text-white" onClick={(e) => handleLinkClick(e, '/')}>ホーム</Nav.Link></Link>
      </Nav.Item>

      <Card className="bg-dark text-white border-0">
        <Card.Header className="p-0 border-0">
            <CustomAccordionToggle eventKey="0" callback={() => handleLinkClick({ preventDefault: () => {} } as React.MouseEvent<HTMLAnchorElement>, '/customers')}>
                <div className={`nav-link text-white ${isCustomerRoute ? 'active' : ''}`}>得意先登録</div>
            </CustomAccordionToggle>
        </Card.Header>
        <Accordion.Collapse eventKey="0">
          <Card.Body className="py-1 ps-4">
            <Nav className="flex-column">
              <Nav.Item>
                <Link href="/customers/new" passHref legacyBehavior><Nav.Link className="text-white py-1" onClick={(e) => handleLinkClick(e, '/customers/new')}>新規登録</Nav.Link></Link>
              </Nav.Item>
              <Nav.Item>
                <Link href="/customers/change" passHref legacyBehavior><Nav.Link className="text-white py-1" onClick={(e) => handleLinkClick(e, '/customers/change')}>既存情報の変更</Nav.Link></Link>
              </Nav.Item>
            </Nav>
          </Card.Body>
        </Accordion.Collapse>
      </Card>

      <Nav.Item className="mb-2">
        <Link href="/reservations" passHref legacyBehavior><Nav.Link className="text-white" onClick={(e) => handleLinkClick(e, '/reservations')}>施設予約</Nav.Link></Link>
      </Nav.Item>

      <Nav.Item className="mb-2">
        <Link href="/history" passHref legacyBehavior><Nav.Link className="text-white d-flex justify-content-between align-items-center" onClick={(e) => handleLinkClick(e, '/history')}>申請履歴 {pendingCount > 0 && <Badge pill bg="danger">{pendingCount}</Badge>}</Nav.Link></Link>
      </Nav.Item>

      {settings.show_approval_form_menu && (
        <Nav.Item className="mb-2">
          <Link href="/approval-form" passHref legacyBehavior><Nav.Link className="text-white" onClick={(e) => handleLinkClick(e, '/approval-form')}>サンプル申請</Nav.Link></Link>
        </Nav.Item>
      )}

      {settings.isEvaluationOpen && (
        <>
          <Nav.Item className="mb-2">
            <Link href="/evaluations" passHref legacyBehavior><Nav.Link className="text-white" onClick={(e) => handleLinkClick(e, '/evaluations')}>新人考課</Nav.Link></Link>
          </Nav.Item>
        </>
      )}

      {settings.isProposalOpen && (
        <Nav.Item className="mb-2">
          <Link href="/proposals" passHref legacyBehavior><Nav.Link className="text-white" onClick={(e) => handleLinkClick(e, '/proposals')}>催事提案</Nav.Link></Link>
        </Nav.Item>
      )}

      <Nav.Item className="mb-2">
        <Nav.Link href="https://shift-management-app-sage.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-white">シフト管理</Nav.Link>
      </Nav.Item>

      <Nav.Item>
        <Link href="/admin" passHref legacyBehavior><Nav.Link className="text-white" onClick={(e) => handleLinkClick(e, '/admin')}>管理画面</Nav.Link></Link>
      </Nav.Item>
    </Accordion>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [showMenu, setShowMenu] = useState(false);
  const handleClose = () => setShowMenu(false);
  const handleShow = () => setShowMenu(true);

  const BrandLogo = () => (
    <div className="d-flex align-items-center">
<Image src="/logo.png" alt="Logo" width={40} height={40} className="me-2" />
        <span className="fw-bold">社内ツール</span>
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <Navbar bg="dark" variant="dark" expand={false} className="d-md-none sticky-top">
        <Container fluid>
          <Navbar.Brand href="/"><BrandLogo /></Navbar.Brand>
          <Navbar.Toggle aria-controls="offcanvas-navbar" onClick={handleShow} />
        </Container>
      </Navbar>

      {/* Offcanvas Menu for Mobile */}
      <Offcanvas show={showMenu} onHide={handleClose} className="bg-dark text-white d-md-none">
        <Offcanvas.Header closeButton closeVariant="white">
          <Offcanvas.Title>メニュー</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <SidebarNav onLinkClick={handleClose} />
        </Offcanvas.Body>
      </Offcanvas>

      <Container fluid>
        <Row>
          {/* Desktop Sidebar */}
          <Col md={2} className="bg-dark text-white vh-100 d-none d-md-block p-3 position-fixed">
            <div className="mb-4 text-center"><BrandLogo /></div>
            <SidebarNav />
          </Col>

          {/* Main Content */}
          <Col md={{ span: 10, offset: 2 }}>
            <main className="p-4">
                <Container style={{ maxWidth: '1200px' }}>
                    {children}
                </Container>
            </main>
          </Col>
        </Row>
      </Container>
    </>
  );
}
