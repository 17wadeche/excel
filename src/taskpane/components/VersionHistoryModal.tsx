// src/taskpane/components/VersionHistoryModal.tsx
import React, { useContext } from "react";
import { Modal, List, Button, Typography, Tag, Empty } from "antd";
import { DashboardContext } from "../context/DashboardContext";
import { DashboardVersion, DashboardItem } from "../components/types";
interface VersionHistoryModalProps {
  visible: boolean;
  onClose: () => void;
}
const { Text, Paragraph } = Typography;
const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ visible, onClose }) => {
  const dashboardContext = useContext(DashboardContext);
  if (!dashboardContext) {
    return null;
  }
  const { dashboards, currentDashboardId, restoreDashboardVersion } = dashboardContext;
  const currentDashboard = dashboards.find((d: DashboardItem) => d.id === currentDashboardId);
  const versions = [...(currentDashboard?.versions ?? [])].sort((a, b) =>
    a.timestamp < b.timestamp ? 1 : -1
  );
  const handleRestore = (versionId: string) => {
    restoreDashboardVersion(versionId);
    onClose();
  };
  return (
    <Modal title="Version History" open={visible} onCancel={onClose} footer={null} width={680}>
      {versions.length === 0 ? (
        <Empty description="No snapshots saved yet" />
      ) : (
        <List
          dataSource={versions}
          renderItem={(version: DashboardVersion) => (
            <List.Item
              actions={[
                <Button key="restore" onClick={() => handleRestore(version.id)} type="primary">
                  Restore
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <span>
                    {version.name || version.title || "Untitled snapshot"}{" "}
                    <Tag>{version.components.length} widgets</Tag>
                  </span>
                }
                description={
                  <div>
                    <Text type="secondary">
                      Saved {new Date(version.timestamp).toLocaleString()}
                    </Text>
                    <br />
                    <Text>Dashboard title: {version.title || "Untitled Dashboard"}</Text>
                    {version.note && (
                      <Paragraph style={{ marginBottom: 0 }}>{version.note}</Paragraph>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Modal>
  );
};
export default VersionHistoryModal;