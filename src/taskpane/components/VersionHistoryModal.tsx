// src/taskpane/components/VersionHistoryModal.tsx
import React, { useContext } from "react";
import { Modal, List, Button, Typography, Tag, Empty, Space, message } from "antd";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { DashboardContext } from "../context/DashboardContext";
import { DashboardVersion, DashboardItem } from "../components/types";
import { diffDashboardVersions, hasDashboardVersionDiff } from "../utils/versionDiff";
interface VersionHistoryModalProps {
  visible: boolean;
  onClose: () => void;
}
const { Text, Paragraph } = Typography;
const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ visible, onClose }) => {
  const navigate = useNavigate();
  const dashboardContext = useContext(DashboardContext);
  if (!dashboardContext) {
    return null;
  }
  const { dashboards, currentDashboardId, restoreDashboardVersion, addDashboard, currentWorkbookId, userEmail } = dashboardContext;
  const currentDashboard = dashboards.find((d: DashboardItem) => d.id === currentDashboardId);
  const versions = [...(currentDashboard?.versions ?? [])].sort((a, b) =>
    a.timestamp < b.timestamp ? 1 : -1
  );
  const handleRestore = (versionId: string) => {
    restoreDashboardVersion(versionId);
    onClose();
  };
  const handleDuplicate = async (version: DashboardVersion) => {
    if (!currentDashboard) {
      message.error("No active dashboard is available to duplicate from.");
      return;
    }
    const duplicatedDashboard = await addDashboard({
      ...currentDashboard,
      id: uuidv4(),
      title: `${version.name || version.title || currentDashboard.title} Copy`,
      components: version.components,
      layouts: version.layouts,
      borderSettings: version.borderSettings,
      workbookId: currentWorkbookId || currentDashboard.workbookId,
      userEmail: userEmail || currentDashboard.userEmail,
      versions: [],
    });
    message.success("Snapshot duplicated as a new dashboard.");
    onClose();
    navigate(`/dashboard/${duplicatedDashboard.id}`);
  };
  return (
    <Modal title="Version History" open={visible} onCancel={onClose} footer={null} width={680}>
      {versions.length === 0 ? (
        <Empty description="No snapshots saved yet" />
      ) : (
        <List
          dataSource={versions}
          renderItem={(version: DashboardVersion) => {
            const diff = currentDashboard
              ? diffDashboardVersions(currentDashboard, version)
              : null;
            return (
              <List.Item
                actions={[
                  <Button key="duplicate" onClick={() => handleDuplicate(version)}>
                    Duplicate
                  </Button>,
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
                    {diff && hasDashboardVersionDiff(diff) && (
                      <Space size={[4, 4]} wrap>
                        {diff.addedWidgets > 0 && <Tag color="green">+{diff.addedWidgets}</Tag>}
                        {diff.removedWidgets > 0 && <Tag color="red">-{diff.removedWidgets}</Tag>}
                        {diff.changedWidgets > 0 && <Tag color="blue">{diff.changedWidgets} changed</Tag>}
                        {diff.layoutChanged && <Tag color="purple">layout</Tag>}
                        {diff.titleChanged && <Tag color="gold">title</Tag>}
                        {diff.borderChanged && <Tag color="cyan">style</Tag>}
                      </Space>
                    )}
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
            );
          }}
        />
      )}
    </Modal>
  );
};
export default VersionHistoryModal;