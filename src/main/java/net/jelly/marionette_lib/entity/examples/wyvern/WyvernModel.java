package net.jelly.marionette_lib.entity.examples.wyvern;

import net.jelly.marionette_lib.utility.MultipartModel;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.model.geom.PartPose;
import net.minecraft.client.model.geom.builders.*;

public class WyvernModel extends MultipartModel<WyvernEntity> {

    public static LayerDefinition createBodyLayer() {
        MeshDefinition meshdefinition = new MeshDefinition();
        PartDefinition partdefinition = meshdefinition.getRoot();

        PartDefinition bone = partdefinition.addOrReplaceChild("bone", CubeListBuilder.create().texOffs(0, 36).addBox(-4.0F, -4.0F, -4.0F, 8.0F, 8.0F, 8.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone2 = partdefinition.addOrReplaceChild("bone2", CubeListBuilder.create().texOffs(36, 0).addBox(-4.0F, -4.0F, -4.0F, 8.0F, 8.0F, 8.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone3 = partdefinition.addOrReplaceChild("bone3", CubeListBuilder.create().texOffs(36, 16).addBox(-4.0F, -4.0F, -4.0F, 8.0F, 8.0F, 8.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone4 = partdefinition.addOrReplaceChild("bone4", CubeListBuilder.create().texOffs(32, 36).addBox(-4.0F, -4.0F, -4.0F, 8.0F, 8.0F, 8.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone5 = partdefinition.addOrReplaceChild("bone5", CubeListBuilder.create().texOffs(0, 52).addBox(-4.0F, -4.0F, -4.0F, 8.0F, 8.0F, 8.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone6 = partdefinition.addOrReplaceChild("bone6", CubeListBuilder.create().texOffs(32, 52).addBox(-4.0F, -4.0F, -4.0F, 8.0F, 8.0F, 8.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone7 = partdefinition.addOrReplaceChild("bone7", CubeListBuilder.create().texOffs(64, 32).addBox(-4.0F, -4.0F, -4.0F, 8.0F, 8.0F, 8.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone8 = partdefinition.addOrReplaceChild("bone8", CubeListBuilder.create().texOffs(64, 48).addBox(-4.0F, -4.0F, -4.0F, 8.0F, 8.0F, 8.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone9 = partdefinition.addOrReplaceChild("bone9", CubeListBuilder.create().texOffs(64, 64).addBox(-4.0F, -4.0F, -4.0F, 8.0F, 8.0F, 8.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone10 = partdefinition.addOrReplaceChild("bone10", CubeListBuilder.create().texOffs(0, 68).addBox(-4.0F, -4.0F, -4.0F, 8.0F, 8.0F, 8.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 24.0F, 0.0F));

        PartDefinition bone11 = partdefinition.addOrReplaceChild("bone11", CubeListBuilder.create().texOffs(0, 0).addBox(-1.0F, -2.0F, -8.0F, 2.0F, 2.0F, 16.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 25.0F, 0.0F));

        PartDefinition bone12 = partdefinition.addOrReplaceChild("bone12", CubeListBuilder.create().texOffs(0, 18).addBox(-1.0F, -2.0F, -8.0F, 2.0F, 2.0F, 16.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 25.0F, 0.0F));

        PartDefinition bone13 = partdefinition.addOrReplaceChild("bone13", CubeListBuilder.create().texOffs(0, 0).addBox(-1.0F, -2.0F, -8.0F, 2.0F, 2.0F, 16.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 25.0F, 0.0F));

        PartDefinition bone14 = partdefinition.addOrReplaceChild("bone14", CubeListBuilder.create().texOffs(0, 18).addBox(-1.0F, -2.0F, -8.0F, 2.0F, 2.0F, 16.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 25.0F, 0.0F));

        PartDefinition bone15 = partdefinition.addOrReplaceChild("bone15", CubeListBuilder.create().texOffs(0, 0).addBox(-1.0F, -2.0F, -8.0F, 2.0F, 2.0F, 16.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 25.0F, 0.0F));

        PartDefinition bone16 = partdefinition.addOrReplaceChild("bone16", CubeListBuilder.create().texOffs(0, 18).addBox(-1.0F, -2.0F, -8.0F, 2.0F, 2.0F, 16.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 25.0F, 0.0F));

        PartDefinition bone17 = partdefinition.addOrReplaceChild("bone17", CubeListBuilder.create().texOffs(0, 0).addBox(-1.0F, -2.0F, -8.0F, 2.0F, 2.0F, 16.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 25.0F, 0.0F));

        PartDefinition bone18 = partdefinition.addOrReplaceChild("bone18", CubeListBuilder.create().texOffs(0, 18).addBox(-1.0F, -2.0F, -8.0F, 2.0F, 2.0F, 16.0F, new CubeDeformation(0.0F)), PartPose.offset(0.0F, 25.0F, 0.0F));

        return LayerDefinition.create(meshdefinition, 128, 128);
    }

    public WyvernModel(ModelPart root) {
        // segment names. names of the folders containing the geometry of each animatable segment in blockbench
        super(root, new String[]
                {"bone", "bone2", "bone3", "bone4", "bone5", "bone6", "bone7", "bone8", "bone9", "bone10",
                        "bone11", "bone12", "bone13", "bone14", "bone15", "bone16", "bone17", "bone18"});
    }

}
