'use client';

import { Card, Col, Row } from 'react-bootstrap';
import Link from 'next/link';
import { PersonPlusFill, PencilSquare } from 'react-bootstrap-icons';

export default function CustomerMenuPage() {
  const menuItems = [
    {
      href: '/customers/new',
      title: '新規登録',
      description: '新しい得意先の情報を登録します。',
      icon: <PersonPlusFill size={40} />,
      bg: 'primary',
    },
    {
      href: '/customers/change',
      title: '既存情報の変更',
      description: '既存の得意先情報を変更します。',
      icon: <PencilSquare size={40} />,
      bg: 'success',
    },
  ];

  return (
    <div>
      <h1 className="mb-4">得意先登録・変更</h1>
      <p>実行したい操作を選択してください。</p>
      <Row xs={1} md={2} className="g-4 mt-3">
        {menuItems.map((item, idx) => (
          <Col key={idx}>
            <Link href={item.href} passHref legacyBehavior>
              <Card as="a" bg={item.bg} text="white" className="h-100 text-decoration-none">
                <Card.Body className="d-flex align-items-center">
                  <div className="me-3">{item.icon}</div>
                  <div>
                    <Card.Title as="h5">{item.title}</Card.Title>
                    <Card.Text>{item.description}</Card.Text>
                  </div>
                </Card.Body>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  );
}
